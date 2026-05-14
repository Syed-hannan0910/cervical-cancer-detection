"""
CervixAI — Cervical Cancer Detection API
Flask Backend | Production-ready for Render deployment
"""

from flask import Flask, request, redirect, url_for, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
import os
import joblib
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms
import timm
import cv2
from PIL import Image
import shap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import sqlite3
from datetime import datetime, timedelta
import io
import base64
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from dotenv import load_dotenv

load_dotenv()

# ============================================
# APP CONFIGURATION
# ============================================
app = Flask(__name__)

# Core config from environment variables
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=12)
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Database path - use writable /tmp on Render free tier or a persistent path
DB_PATH = os.environ.get('DB_PATH', 'users.db')

# CORS — allow Vercel frontend origin
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
CORS(app, origins=[FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
     supports_credentials=True)

jwt = JWTManager(app)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ============================================
# DATABASE SETUP
# ============================================
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            age TEXT,
            purpose TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            risk_level TEXT,
            probability REAL,
            cell_type TEXT,
            cell_confidence REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ============================================
# ML MODEL LOADING
# ============================================
print("Loading ML models...")

MODEL_DIR = os.environ.get('MODEL_DIR', 'model')

try:
    model_xgb = joblib.load(os.path.join(MODEL_DIR, 'xgboost_model.pkl'))
    scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
    feature_names = joblib.load(os.path.join(MODEL_DIR, 'feature_names.pkl'))
    print("✓ XGBoost model loaded")
except Exception as e:
    print(f"⚠ XGBoost model not found: {e}")
    model_xgb = scaler = feature_names = None

class FastViTClassifier(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        self.base_model = timm.create_model('fastvit_t8', pretrained=False, num_classes=0)
        with torch.no_grad():
            dummy = torch.randn(1, 3, 224, 224)
            feature_size = self.base_model(dummy).shape[1]
        self.classifier = nn.Sequential(
            nn.BatchNorm1d(feature_size),
            nn.Dropout(0.3),
            nn.Linear(feature_size, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.classifier(self.base_model(x))

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
CLASS_NAMES = ['Dyskeratotic', 'Koilocytotic', 'Metaplastic', 'Parabasal', 'Superficial-Intermediate']

try:
    model_fastvit = FastViTClassifier(num_classes=5)
    model_fastvit.load_state_dict(
        torch.load(os.path.join(MODEL_DIR, 'best_fastvit_model.pth'), map_location=device)
    )
    model_fastvit = model_fastvit.to(device)
    model_fastvit.eval()
    print("✓ FastViT model loaded")
except Exception as e:
    print(f"⚠ FastViT model not found: {e}")
    model_fastvit = None

print(f"✓ Running on device: {device}")

# ============================================
# HELPER FUNCTIONS
# ============================================
FEATURE_INDICES = {
    'Age': 0, 'Number of sexual partners': 1,
    'First sexual intercourse': 2, 'Num of pregnancies': 3,
    'Smokes (packs/year)': 6, 'STDs (number)': 12,
    'STDs:genital herpes': 19, 'Dx:CIN': 29,
    'Schiller': 33, 'Citology': 34
}

def create_feature_vector(user_input):
    vec = np.zeros(35)
    for name, val in user_input.items():
        if name in FEATURE_INDICES:
            vec[FEATURE_INDICES[name]] = val
    return vec.reshape(1, -1)

def predict_risk(user_input):
    features = create_feature_vector(user_input)
    scaled = scaler.transform(features)
    prediction = model_xgb.predict(scaled)[0]
    proba = model_xgb.predict_proba(scaled)[0]
    explainer = shap.TreeExplainer(model_xgb)
    shap_vals = explainer.shap_values(scaled)
    return int(prediction), proba, shap_vals, scaled

def generate_shap_plot(shap_vals, scaled):
    plt.figure(figsize=(10, 6))
    explainer = shap.TreeExplainer(model_xgb)
    explanation = shap.Explanation(
        values=shap_vals[0],
        base_values=explainer.expected_value,
        data=scaled[0],
        feature_names=feature_names
    )
    shap.waterfall_plot(explanation, show=False)
    plt.title('SHAP Feature Impact Analysis', fontsize=14, fontweight='bold', pad=12)
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='white')
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    return encoded

def predict_image(image_path):
    img = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    tensor = transform(img_rgb).unsqueeze(0).to(device)
    with torch.no_grad():
        out = model_fastvit(tensor)
        proba = torch.softmax(out, dim=1)[0].cpu().numpy()
        pred = int(np.argmax(proba))
    return pred, float(proba[pred] * 100), proba

def generate_gradcam(image_path, pred_class):
    from pytorch_grad_cam import GradCAM
    from pytorch_grad_cam.utils.image import show_cam_on_image
    img = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (224, 224))
    transform = transforms.Compose([
        transforms.ToPILImage(), transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    tensor = transform(img_rgb).unsqueeze(0).to(device)
    cam = GradCAM(model=model_fastvit, target_layers=[model_fastvit.base_model.stages[-1]])
    grayscale = cam(input_tensor=tensor, targets=None)
    heatmap = show_cam_on_image(img_resized / 255.0, grayscale[0], use_rgb=True)
    _, buf = cv2.imencode('.png', cv2.cvtColor(heatmap, cv2.COLOR_RGB2BGR))
    return base64.b64encode(buf).decode('utf-8')

def save_result_file(user_id, filename, data):
    results_dir = os.path.join(app.config['UPLOAD_FOLDER'], f'results_{user_id}')
    os.makedirs(results_dir, exist_ok=True)
    path = os.path.join(results_dir, filename)
    with open(path, 'w') as f:
        f.write(data)
    return path

def load_result_file(user_id, filename):
    path = os.path.join(app.config['UPLOAD_FOLDER'], f'results_{user_id}', filename)
    if os.path.exists(path):
        with open(path, 'r') as f:
            return f.read()
    return None

# ============================================
# AUTH ROUTES
# ============================================
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'xgboost_loaded': model_xgb is not None,
        'fastvit_loaded': model_fastvit is not None,
        'device': str(device)
    })

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    required = ['username', 'password', 'email']
    if not all(data.get(f) for f in required):
        return jsonify({'error': 'Username, password and email are required'}), 400

    hashed = generate_password_hash(data['password'])
    try:
        conn = get_db()
        conn.execute('''
            INSERT INTO users (username, password, email, first_name, last_name, age, purpose)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['username'], hashed, data['email'],
            data.get('first_name', ''), data.get('last_name', ''),
            data.get('age', ''), data.get('purpose', '')
        ))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Account created successfully'}), 201
    except sqlite3.IntegrityError as e:
        return jsonify({'error': 'Username or email already exists'}), 409

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid username or password'}), 401

    token = create_access_token(identity={
        'id': user['id'],
        'username': user['username'],
        'email': user['email']
    })
    return jsonify({
        'access_token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name']
        }
    })

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity()
    return jsonify({'user': identity})

# ============================================
# PREDICTION ROUTES
# ============================================
@app.route('/api/predict', methods=['POST'])
@jwt_required()
def predict():
    if model_xgb is None:
        return jsonify({'error': 'XGBoost model not loaded. Check model files.'}), 503

    identity = get_jwt_identity()
    user_id = identity['id']

    try:
        form = request.get_json()
        user_input = {
            'Age': float(form['age']),
            'Schiller': int(form['schiller']),
            'Citology': int(form['citology']),
            'Dx:CIN': int(form['dx_cin']),
            'STDs:genital herpes': int(form['genital_herpes']),
            'STDs (number)': int(form['stds_number']),
            'Number of sexual partners': int(form['sexual_partners']),
            'First sexual intercourse': float(form['first_intercourse']),
            'Num of pregnancies': int(form['pregnancies']),
            'Smokes (packs/year)': float(form['smoking'])
        }

        prediction, proba, shap_vals, scaled = predict_risk(user_input)
        shap_plot = generate_shap_plot(shap_vals, scaled)
        save_result_file(user_id, 'shap_plot.txt', shap_plot)

        risk_prob = float(proba[1])
        risk_level = 'HIGH' if risk_prob > 0.5 else 'LOW'

        # Save to assessments table
        conn = get_db()
        conn.execute('''
            INSERT INTO assessments (user_id, risk_level, probability)
            VALUES (?, ?, ?)
        ''', (user_id, risk_level, risk_prob))
        conn.commit()
        conn.close()

        response = {
            'risk_level': risk_level,
            'probability': risk_prob,
            'shap_plot': shap_plot,
            'user_input': user_input
        }
        return jsonify(response)

    except KeyError as e:
        return jsonify({'error': f'Missing field: {e}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload_image', methods=['POST'])
@jwt_required()
def upload_image():
    if model_fastvit is None:
        return jsonify({'error': 'FastViT model not loaded. Check model files.'}), 503

    identity = get_jwt_identity()
    user_id = identity['id']

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    filename = secure_filename(f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        pred_class, confidence, proba = predict_image(filepath)
        gradcam = generate_gradcam(filepath, pred_class)
        save_result_file(user_id, 'gradcam.txt', gradcam)

        # Update latest assessment
        conn = get_db()
        conn.execute('''
            UPDATE assessments SET cell_type=?, cell_confidence=?
            WHERE user_id=? ORDER BY created_at DESC LIMIT 1
        ''', (CLASS_NAMES[pred_class], confidence, user_id))
        conn.commit()
        conn.close()

        return jsonify({
            'cell_type': CLASS_NAMES[pred_class],
            'confidence': confidence,
            'gradcam': gradcam,
            'probabilities': {CLASS_NAMES[i]: float(proba[i]) for i in range(5)}
        })
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/api/results/shap', methods=['GET'])
@jwt_required()
def get_shap():
    identity = get_jwt_identity()
    data = load_result_file(identity['id'], 'shap_plot.txt')
    if data:
        return jsonify({'shap_plot': data})
    return jsonify({'error': 'SHAP plot not found'}), 404

@app.route('/api/results/gradcam', methods=['GET'])
@jwt_required()
def get_gradcam_route():
    identity = get_jwt_identity()
    data = load_result_file(identity['id'], 'gradcam.txt')
    if data:
        return jsonify({'gradcam': data})
    return jsonify({'error': 'Grad-CAM not found'}), 404

@app.route('/api/history', methods=['GET'])
@jwt_required()
def history():
    identity = get_jwt_identity()
    conn = get_db()
    rows = conn.execute('''
        SELECT id, risk_level, probability, cell_type, cell_confidence, created_at
        FROM assessments WHERE user_id=? ORDER BY created_at DESC LIMIT 20
    ''', (identity['id'],)).fetchall()
    conn.close()
    return jsonify({'assessments': [dict(r) for r in rows]})

def generate_advanced_report(identity, data, user_id):
    """
    Generates a fully formatted, branded multi-page PDF report.
    Adapted from session-based to JWT/JSON-based for API deployment.

    Page 1 : Header banner · Patient summary · Risk classification box
             · Clinical input table · SHAP explainability chart
    Page 2 : Cytological analysis + Grad-CAM heatmap  (if cell_type present)
    Page 3 : Clinical recommendations + Medical disclaimer
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # ── Colour palette ──────────────────────────────────────────────
    PRIMARY = colors.HexColor('#2c3e50')   # Navy
    ACCENT  = colors.HexColor('#3498db')   # Blue
    LIGHT   = colors.HexColor('#ecf0f1')   # Light grey background
    RED     = colors.HexColor('#e74c3c')   # High-risk red
    GREEN   = colors.HexColor('#27ae60')   # Low-risk green

    def draw_footer(canvas_obj, page_num):
        """Consistent footer on every page."""
        canvas_obj.saveState()
        canvas_obj.setFont('Helvetica-Oblique', 8)
        canvas_obj.setFillColor(colors.grey)
        canvas_obj.drawCentredString(
            width / 2, 28,
            'Confidential — CervixAI Medical AI Research Report  |  '
            f'Page {page_num}  |  '
            f'Generated {datetime.now().strftime("%B %d, %Y")}'
        )
        canvas_obj.setStrokeColor(ACCENT)
        canvas_obj.setLineWidth(0.5)
        canvas_obj.line(50, 40, width - 50, 40)
        canvas_obj.restoreState()

    # ═══════════════════════════════════════════════════════════════
    # PAGE 1 — Risk Summary
    # ═══════════════════════════════════════════════════════════════

    # ── 1a. Full-width header banner ────────────────────────────────
    c.setFillColor(PRIMARY)
    c.rect(0, height - 110, width, 110, fill=1, stroke=0)

    # Optional logo (place logo.png / logo.jpg in backend root)
    for logo_name in ['logo.png', 'logo.jpg']:
        logo_path = os.path.join(os.path.dirname(__file__), logo_name)
        if os.path.exists(logo_path):
            try:
                c.drawImage(logo_path, 35, height - 98,
                            width=75, height=75,
                            preserveAspectRatio=True, mask='auto')
            except Exception:
                pass
            break

    c.setFillColor(colors.whitesmoke)
    c.setFont('Helvetica-Bold', 19)
    c.drawString(140, height - 48, 'CERVICAL CANCER RISK ASSESSMENT')
    c.setFont('Helvetica-Bold', 10)
    c.drawString(140, height - 68, 'SCHOOL OF ENGINEERING (SOE)  |  ACADEMIC PROJECT')
    c.setFont('Helvetica', 8)
    c.drawString(140, height - 84,
                 f'Authenticated Report: {datetime.now().strftime("%B %d, %Y  |  %H:%M")}')

    y = height - 145

    # ── 1b. Patient summary section ─────────────────────────────────
    c.setFillColor(PRIMARY)
    c.setFont('Helvetica-Bold', 14)
    c.drawString(50, y, 'Patient Diagnostic Summary')
    y -= 10
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.5)
    c.line(50, y, width - 50, y)
    y -= 30

    patient_rows = [
        ['Patient Name:', identity.get('username', 'N/A'),
         'User ID:',      f"ID-{identity.get('id', '000')}"],
        ['Report Date:',  datetime.now().strftime('%Y-%m-%d'),
         'Analysis Mode:', 'Dual-Stage AI (XGBoost + FastViT)'],
        ['Email:',        identity.get('email', 'N/A'),
         'Supervision:',  'SOE Institutional'],
    ]
    pt_table = Table(patient_rows, colWidths=[1.2*inch, 2.4*inch, 1.4*inch, 2.1*inch])
    pt_table.setStyle(TableStyle([
        ('FONTSIZE',  (0, 0), (-1, -1), 9),
        ('FONTNAME',  (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',  (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, -1), PRIMARY),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    pt_table.wrapOn(c, 50, y)
    pt_table.drawOn(c, 50, y - pt_table._height)
    y -= pt_table._height + 25

    # ── 1c. Risk classification box ─────────────────────────────────
    prob     = data.get('probability', 0)
    is_high  = prob > 0.5
    box_color = RED if is_high else GREEN
    risk_label = 'HIGH RISK' if is_high else 'LOW RISK'
    risk_emoji = '⚠  ' if is_high else '✓  '

    c.setFillColor(LIGHT)
    c.setStrokeColor(box_color)
    c.setLineWidth(2.5)
    c.roundRect(50, y - 75, width - 100, 75, 8, fill=1, stroke=1)

    # Coloured left accent strip
    c.setFillColor(box_color)
    c.roundRect(50, y - 75, 8, 75, 4, fill=1, stroke=0)

    c.setFillColor(PRIMARY)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(72, y - 18, 'AI CLASSIFICATION RESULT')

    c.setFillColor(box_color)
    c.setFont('Helvetica-Bold', 26)
    c.drawString(72, y - 48, f'{risk_emoji}{risk_label}')

    c.setFillColor(PRIMARY)
    c.setFont('Helvetica', 10)
    c.drawRightString(width - 65, y - 30, f'Risk Probability:')
    c.setFont('Helvetica-Bold', 15)
    c.setFillColor(box_color)
    c.drawRightString(width - 65, y - 50, f'{prob:.2%}')

    y -= 95

    # ── 1d. Clinical input data table ───────────────────────────────
    c.setFillColor(PRIMARY)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(50, y, 'Clinical Input Data')
    y -= 18

    u_in = data.get('user_input', {})
    def yn(val):  return 'Positive' if val == 1 else 'Negative'
    def yesno(val): return 'Yes' if val == 1 else 'No'

    input_rows = [
        ['Feature', 'Value', 'Feature', 'Value'],
        ['Age',
         f"{int(u_in.get('Age', u_in.get('age', 0)))} yrs",
         'Pregnancies',
         str(int(u_in.get('Num of pregnancies', u_in.get('pregnancies', 0))))],
        ['Schiller Test',
         yn(u_in.get('Schiller', u_in.get('schiller', 0))),
         'Citology (PAP)',
         yn(u_in.get('Citology', u_in.get('citology', 0)))],
        ['Dx: CIN',
         yesno(u_in.get('Dx:CIN', u_in.get('dx_cin', 0))),
         'Genital Herpes',
         yesno(u_in.get('STDs:genital herpes', u_in.get('genital_herpes', 0)))],
        ['STD Count',
         str(int(u_in.get('STDs (number)', u_in.get('stds_number', 0)))),
         'Sexual Partners',
         str(int(u_in.get('Number of sexual partners', u_in.get('sexual_partners', 0))))],
        ['First Intercourse',
         f"{int(u_in.get('First sexual intercourse', u_in.get('first_intercourse', 0)))} yrs",
         'Smoking',
         f"{float(u_in.get('Smokes (packs/year)', u_in.get('smoking', 0))):.1f} pk/yr"],
    ]
    t_feat = Table(input_rows, colWidths=[1.6*inch, 1.4*inch, 1.6*inch, 1.4*inch])
    t_feat.setStyle(TableStyle([
        # Header row
        ('BACKGROUND',    (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 9),
        # Data rows
        ('FONTSIZE',      (0, 1), (-1, -1), 9),
        ('FONTNAME',      (0, 1), (0, -1),  'Helvetica-Bold'),
        ('FONTNAME',      (2, 1), (2, -1),  'Helvetica-Bold'),
        ('TEXTCOLOR',     (0, 1), (-1, -1), PRIMARY),
        ('BACKGROUND',    (0, 2), (-1, 2),  LIGHT),
        ('BACKGROUND',    (0, 4), (-1, 4),  LIGHT),
        # Grid & alignment
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS',(0, 0), (-1, -1), [None]),
    ]))
    t_feat.wrapOn(c, 50, y - 120)
    t_feat.drawOn(c, 50, y - 120)
    y -= 130

    # ── 1e. SHAP explainability chart ───────────────────────────────
    c.setFillColor(PRIMARY)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(50, y, 'Explainable AI (XAI) — Feature Importance (SHAP)')
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.grey)
    c.drawString(50, y - 12,
                 'Each bar shows how strongly that feature pushed the prediction toward high or low risk.')
    y -= 20

    shap_b64 = load_result_file(user_id, 'shap_plot.txt')
    if shap_b64:
        shap_img = ImageReader(io.BytesIO(base64.b64decode(shap_b64)))
        img_h = 200
        # If not enough space on page, push to next page
        if y - img_h < 60:
            draw_footer(c, 1)
            c.showPage()
            y = height - 60
        c.drawImage(shap_img, 55, y - img_h, width=490, height=img_h,
                    preserveAspectRatio=True)
        y -= img_h + 10
    else:
        c.setFont('Helvetica-Oblique', 9)
        c.setFillColor(colors.grey)
        c.drawString(55, y - 15, 'SHAP plot not available for this report.')
        y -= 25

    draw_footer(c, 1)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 2 — Cytological Analysis (only when cell_type is present)
    # ═══════════════════════════════════════════════════════════════
    cell_type       = data.get('cell_type')
    cell_confidence = data.get('cell_confidence', 0)

    if cell_type:
        c.showPage()
        y = height - 60

        # Section header
        c.setFillColor(PRIMARY)
        c.setFont('Helvetica-Bold', 16)
        c.drawString(50, y, 'Cytological Visual Analysis  —  Stage 2')
        y -= 10
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.5)
        c.line(50, y, width - 50, y)
        y -= 30

        # Cell classification result box
        c.setFillColor(LIGHT)
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.2)
        c.roundRect(50, y - 55, width - 100, 55, 6, fill=1, stroke=1)
        c.setFillColor(PRIMARY)
        c.setFont('Helvetica-Bold', 11)
        c.drawString(70, y - 18, 'FASTVIT CELL CLASSIFICATION')
        c.setFont('Helvetica-Bold', 16)
        c.setFillColor(ACCENT)
        c.drawString(70, y - 40, cell_type)
        c.setFont('Helvetica-Bold', 11)
        c.setFillColor(PRIMARY)
        c.drawRightString(width - 65, y - 22, 'Model Confidence:')
        c.setFont('Helvetica-Bold', 16)
        c.setFillColor(ACCENT)
        c.drawRightString(width - 65, y - 42, f'{cell_confidence:.2f}%')
        y -= 72

        # Cell type legend
        cell_descriptions = {
            'Dyskeratotic':              'Abnormal keratinization — may indicate HPV-related dysplasia.',
            'Koilocytotic':              'Characteristic hollow cells — strongly associated with HPV infection.',
            'Metaplastic':               'Transitional cell type — common at the squamocolumnar junction.',
            'Parabasal':                 'Immature cells from basal layer — can appear after hormonal changes.',
            'Superficial-Intermediate':  'Normal mature squamous cells — typically a benign finding.',
        }
        desc = cell_descriptions.get(cell_type, '')
        if desc:
            c.setFont('Helvetica-Oblique', 9)
            c.setFillColor(colors.grey)
            c.drawString(50, y, f'Clinical note: {desc}')
            y -= 20

        # Grad-CAM heatmap
        gradcam_b64 = load_result_file(user_id, 'gradcam.txt')
        if gradcam_b64:
            c.setFillColor(PRIMARY)
            c.setFont('Helvetica-Bold', 12)
            c.drawString(50, y, 'Grad-CAM Attention Heatmap')
            c.setFont('Helvetica', 8)
            c.setFillColor(colors.grey)
            c.drawString(50, y - 13,
                         'Highlighted regions show cellular areas the AI model focused on during classification.')
            y -= 25

            img_w, img_h = 400, 300
            x_center = (width - img_w) / 2
            # Thin border frame around image
            c.setStrokeColor(ACCENT)
            c.setLineWidth(0.8)
            c.rect(x_center - 2, y - img_h - 2, img_w + 4, img_h + 4)
            gc_img = ImageReader(io.BytesIO(base64.b64decode(gradcam_b64)))
            c.drawImage(gc_img, x_center, y - img_h, width=img_w, height=img_h)
            y -= img_h + 12

            # Colour scale legend
            legend_x = x_center
            legend_w = img_w
            legend_h = 10
            for i in range(int(legend_w)):
                ratio = i / legend_w
                r = int(255 * min(1, ratio * 2))
                g = int(255 * max(0, 1 - abs(ratio - 0.5) * 2))
                b = int(255 * max(0, 1 - ratio * 2))
                c.setFillColorRGB(r/255, g/255, b/255)
                c.rect(legend_x + i, y - legend_h, 1, legend_h, fill=1, stroke=0)
            c.setFont('Helvetica', 7)
            c.setFillColor(colors.grey)
            c.drawString(legend_x,            y - legend_h - 9, 'Low attention')
            c.drawRightString(legend_x + legend_w, y - legend_h - 9, 'High attention')
            y -= legend_h + 18
        else:
            c.setFont('Helvetica-Oblique', 9)
            c.setFillColor(colors.grey)
            c.drawString(50, y, 'Grad-CAM heatmap not available for this report.')
            y -= 20

        draw_footer(c, 2)

    # ═══════════════════════════════════════════════════════════════
    # PAGE 3 — Recommendations & Disclaimer
    # ═══════════════════════════════════════════════════════════════
    c.showPage()
    y = height - 60
    page_num = 3 if cell_type else 2

    # Section header
    c.setFillColor(PRIMARY)
    c.setFont('Helvetica-Bold', 16)
    c.drawString(50, y, 'Clinical Recommendations')
    y -= 10
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.5)
    c.line(50, y, width - 50, y)
    y -= 25

    # Risk-specific intro paragraph
    if is_high:
        intro = ('Your assessment indicates a HIGH RISK profile. Please consult a gynaecologist '
                 'promptly. The following actions are recommended based on your results.')
        intro_color = RED
    else:
        intro = ('Your assessment indicates a LOW RISK profile. Continue your regular health '
                 'monitoring. The following preventive steps are recommended.')
        intro_color = GREEN

    c.setFillColor(intro_color)
    c.setFont('Helvetica-Bold', 10)
    # Wrap intro text manually
    words = intro.split()
    line, wrapped = '', []
    for w in words:
        test = (line + ' ' + w).strip()
        if c.stringWidth(test, 'Helvetica-Bold', 10) < width - 110:
            line = test
        else:
            wrapped.append(line); line = w
    if line: wrapped.append(line)
    for ln in wrapped:
        c.drawString(50, y, ln); y -= 14
    y -= 8

    # Recommendations list — split into general and risk-specific
    general_recs = [
        ('📋', 'Cervical Screenings',
         'Continue regular Pap smear / cervical screenings every 12 months as advised.'),
        ('💉', 'HPV Vaccination',
         'Discuss HPV vaccination with your doctor if not already completed.'),
        ('🥗', 'Healthy Lifestyle',
         'Maintain a balanced diet, regular exercise, and adequate hydration.'),
        ('🚭', 'Avoid Smoking',
         'Smoking significantly increases cervical cancer risk — cessation is strongly advised.'),
        ('🩺', 'Annual Check-up',
         'Attend routine gynaecological check-ups and report unusual symptoms promptly.'),
    ]
    high_recs = [
        ('⚠️', 'Specialist Consultation',
         'Consult a gynaecologist within 1–2 weeks for colposcopy evaluation.'),
        ('🔬', 'Biopsy Discussion',
         'Discuss biopsy options with your physician based on these AI findings.'),
        ('📅', 'Follow-up Frequency',
         'Increase Pap smear frequency to every 6 months until cleared by your doctor.'),
    ]
    recs_to_show = (high_recs + general_recs) if is_high else general_recs

    rec_data = [['#', 'Action', 'Detail']]
    for i, (icon, action, detail) in enumerate(recs_to_show, 1):
        rec_data.append([f'{i}', f'{icon}  {action}', detail])

    rec_table = Table(rec_data, colWidths=[0.3*inch, 1.8*inch, 4.5*inch])
    rec_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  PRIMARY),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0),  9),
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('FONTNAME',      (1, 1), (1, -1),  'Helvetica-Bold'),
        ('TEXTCOLOR',     (0, 1), (-1, -1), PRIMARY),
        ('GRID',          (0, 0), (-1, -1), 0.4, colors.lightgrey),
        ('ALIGN',         (0, 0), (0, -1),  'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, LIGHT]),
    ]))
    tbl_w, tbl_h = rec_table.wrapOn(c, 50, y - 200)
    rec_table.drawOn(c, 50, y - tbl_h)
    y -= tbl_h + 25

    # ── Medical Disclaimer ──────────────────────────────────────────
    c.setFillColor(colors.HexColor('#fff3cd'))
    c.setStrokeColor(colors.HexColor('#ffc107'))
    c.setLineWidth(1)
    disc_h = 90
    if y - disc_h < 55:
        draw_footer(c, page_num)
        c.showPage()
        page_num += 1
        y = height - 60
    c.roundRect(50, y - disc_h, width - 100, disc_h, 6, fill=1, stroke=1)
    c.setFillColor(colors.HexColor('#856404'))
    c.setFont('Helvetica-Bold', 10)
    c.drawString(65, y - 20, '⚕  Medical Disclaimer')
    c.setFont('Helvetica', 8)
    disclaimer_lines = [
        'This AI-powered assessment is produced for informational and academic research purposes only.',
        'It does NOT constitute a medical diagnosis and does NOT replace professional clinical consultation.',
        'All findings should be reviewed by a qualified gynaecologist or oncologist before any action is taken.',
        'In case of urgent symptoms, contact emergency medical services or your healthcare provider immediately.',
    ]
    for i, line in enumerate(disclaimer_lines):
        c.drawString(65, y - 36 - i * 12, line)

    draw_footer(c, page_num)

    c.save()
    buffer.seek(0)
    return buffer


@app.route('/api/download_report', methods=['POST'])
@jwt_required()
def download_report():
    identity = get_jwt_identity()
    user_id  = identity['id']
    data     = request.get_json() or {}

    try:
        pdf_buffer = generate_advanced_report(identity, data, user_id)
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f'CervixAI_Report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf',
            mimetype='application/pdf'
        )
    except Exception as e:
        app.logger.error(f'PDF generation error: {e}')
        return jsonify({'error': 'Failed to generate report. Please try again.'}), 500

# ============================================
# ENTRYPOINT
# ============================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
