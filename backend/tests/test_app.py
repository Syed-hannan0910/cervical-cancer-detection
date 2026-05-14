"""
tests/test_app.py
-----------------
Basic unit and integration tests for the CervixAI Flask API.
Run with:  pytest tests/ -v
"""

import pytest
import json
import os
import sys

# Ensure the backend root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Use a test database to avoid touching production data
os.environ['DB_PATH'] = ':memory:'
os.environ['SECRET_KEY'] = 'test-secret'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret'
os.environ['FRONTEND_URL'] = 'http://localhost:5173'

from app import app, init_db


@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    with app.test_client() as c:
        with app.app_context():
            init_db()
        yield c


@pytest.fixture
def auth_headers(client):
    """Register + login, return JWT headers."""
    client.post('/api/auth/signup', json={
        'username': 'testuser',
        'password': 'testpass123',
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
    })
    resp = client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'testpass123',
    })
    token = resp.get_json()['access_token']
    return {'Authorization': f'Bearer {token}'}


# ─── Health ───────────────────────────────
class TestHealth:
    def test_health_endpoint(self, client):
        r = client.get('/api/health')
        assert r.status_code == 200
        data = r.get_json()
        assert data['status'] == 'ok'
        assert 'xgboost_loaded' in data


# ─── Auth ─────────────────────────────────
class TestAuth:
    def test_signup_success(self, client):
        r = client.post('/api/auth/signup', json={
            'username': 'newuser',
            'password': 'password123',
            'email': 'new@example.com',
        })
        assert r.status_code == 201
        assert 'created' in r.get_json()['message'].lower()

    def test_signup_duplicate_username(self, client):
        payload = {'username': 'dup', 'password': 'abc123', 'email': 'dup@ex.com'}
        client.post('/api/auth/signup', json=payload)
        r = client.post('/api/auth/signup', json={**payload, 'email': 'dup2@ex.com'})
        assert r.status_code == 409

    def test_signup_missing_fields(self, client):
        r = client.post('/api/auth/signup', json={'username': 'partial'})
        assert r.status_code == 400

    def test_login_success(self, client):
        client.post('/api/auth/signup', json={
            'username': 'logintest', 'password': 'pass123', 'email': 'l@ex.com'
        })
        r = client.post('/api/auth/login', json={
            'username': 'logintest', 'password': 'pass123'
        })
        assert r.status_code == 200
        data = r.get_json()
        assert 'access_token' in data
        assert data['user']['username'] == 'logintest'

    def test_login_wrong_password(self, client):
        client.post('/api/auth/signup', json={
            'username': 'wrongpw', 'password': 'correct', 'email': 'w@ex.com'
        })
        r = client.post('/api/auth/login', json={
            'username': 'wrongpw', 'password': 'incorrect'
        })
        assert r.status_code == 401

    def test_me_requires_auth(self, client):
        r = client.get('/api/auth/me')
        assert r.status_code == 401

    def test_me_with_token(self, client, auth_headers):
        r = client.get('/api/auth/me', headers=auth_headers)
        assert r.status_code == 200
        assert r.get_json()['user']['username'] == 'testuser'


# ─── Protected routes without token ───────
class TestUnauthorized:
    def test_predict_requires_auth(self, client):
        r = client.post('/api/predict', json={})
        assert r.status_code == 401

    def test_upload_requires_auth(self, client):
        r = client.post('/api/upload_image')
        assert r.status_code == 401

    def test_history_requires_auth(self, client):
        r = client.get('/api/history')
        assert r.status_code == 401

    def test_shap_requires_auth(self, client):
        r = client.get('/api/results/shap')
        assert r.status_code == 401


# ─── History ──────────────────────────────
class TestHistory:
    def test_history_empty(self, client, auth_headers):
        r = client.get('/api/history', headers=auth_headers)
        assert r.status_code == 200
        assert r.get_json()['assessments'] == []


# ─── Feature vector helper ────────────────
class TestFeatureVector:
    def test_feature_vector_shape(self):
        from app import create_feature_vector
        user_input = {
            'Age': 35, 'Schiller': 1, 'Citology': 0, 'Dx:CIN': 0,
            'STDs:genital herpes': 0, 'STDs (number)': 0,
            'Number of sexual partners': 2, 'First sexual intercourse': 18,
            'Num of pregnancies': 1, 'Smokes (packs/year)': 0
        }
        vec = create_feature_vector(user_input)
        assert vec.shape == (1, 35)

    def test_feature_vector_values(self):
        from app import create_feature_vector, FEATURE_INDICES
        user_input = {'Age': 42, 'Schiller': 1}
        vec = create_feature_vector(user_input)
        assert vec[0, FEATURE_INDICES['Age']] == 42
        assert vec[0, FEATURE_INDICES['Schiller']] == 1
        # Unspecified features should be zero
        assert vec[0, FEATURE_INDICES['Citology']] == 0
