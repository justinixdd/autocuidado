from flask import Flask, request, jsonify, render_template
from flask_pymongo import PyMongo
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt, datetime
from functools import wraps

app = Flask(__name__)
CORS(app)

app.config['MONGO_URI'] = "mongodb+srv://justjust:eTrMyRDvW84eYrV0@autocuidado.evslzur.mongodb.net/autocuidado"
app.config['SECRET_KEY'] = "webserviceautocuidado2025JustinDW0816"

mongo = PyMongo(app)
users = mongo.db.usuarios
surveys = mongo.db.encuestas

@app.route('/')
def home():
    return render_template('index.html')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token=None
        if 'Authorization' in request.headers:
            try: token=request.headers['Authorization'].split(" ")[1]
            except: return jsonify({'message':'Token malformado'}),401
        if not token: return jsonify({'message':'Token requerido'}),401
        try:
            data=jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user=users.find_one({'email':data['email']})
        except: return jsonify({'message':'Token inválido o expirado'}),401
        return f(current_user,*args,**kwargs)
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    data=request.get_json()
    email=data.get('email'); password=data.get('password')
    if not email or not password: return jsonify({'message':'Correo y contraseña requeridos'}),400
    if users.find_one({'email':email}): return jsonify({'message':'Usuario ya existe'}),400
    hashed=generate_password_hash(password)
    users.insert_one({'email':email,'password':hashed})
    return jsonify({'message':'Usuario registrado exitosamente'}),201

@app.route('/api/login', methods=['POST'])
def login():
    data=request.get_json()
    email=data.get('email'); password=data.get('password')
    user=users.find_one({'email':email})
    if not user or not check_password_hash(user['password'],password):
        return jsonify({'success':False,'message':'Credenciales incorrectas'}),401
    token=jwt.encode({'email':user['email'],'exp':datetime.datetime.utcnow()+datetime.timedelta(hours=2)},app.config['SECRET_KEY'],"HS256")
    return jsonify({'success':True,'token':token})

@app.route('/api/submit', methods=['POST'])
@token_required
def submit(current_user):
    data=request.get_json()
    edad=data.get('edad'); score=data.get('score'); level=data.get('level')
    if edad is None or score is None or level is None: return jsonify({'message':'Datos incompletos'}),400
    surveys.insert_one({'email':current_user['email'],'edad':edad,'score':score,'level':level,'fecha':datetime.datetime.utcnow()})
    return jsonify({'message':'Encuesta guardada correctamente'})

@app.route('/api/stats', methods=['GET'])
def stats():
    total=surveys.count_documents({})
    if total==0: return jsonify({'message':'Sin datos aún'})
    bajo=surveys.count_documents({'level':'Bajo'})
    medio=surveys.count_documents({'level':'Medio'})
    alto=surveys.count_documents({'level':'Alto'})
    promedio=list(surveys.aggregate([{"$group":{"_id":None,"promedio":{"$avg":"$score"}}}]))[0]['promedio']
    return jsonify({'total':total,'bajo':bajo,'medio':medio,'alto':alto,'promedio':round(promedio,2)})

@app.route('/api/all', methods=['GET'])
def get_all_surveys():
    return jsonify(list(surveys.find({},{"_id":0})))

if __name__=="__main__":
    app.run(debug=True)
