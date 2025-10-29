const API_URL="http://127.0.0.1:5000/api";
let token=localStorage.getItem("token")||null;

// Preguntas y opciones
const preguntas=[
"Duermo al menos 7 horas por noche.","Mantengo una alimentación equilibrada y tomo suficiente agua.",
"Realizo actividad física al menos tres veces por semana.","Evito el consumo excesivo de cafeína, alcohol o tabaco.",
"Identifico y gestiono mis emociones de forma saludable.","Busco apoyo emocional cuando lo necesito.",
"Practico la autocompasión y evito ser demasiado crítico conmigo.",
"Dedico tiempo a actividades que me generan alegría y satisfacción.",
"Tomo descansos cuando me siento saturado o estresado.",
"Mantengo pensamientos positivos sobre mí y mis capacidades.",
"Administro bien mi tiempo y evito la procrastinación.",
"Tengo estrategias para manejar el estrés o la ansiedad.",
"Mantengo relaciones positivas con familiares y amigos.",
"Me comunico de forma asertiva con las personas a mi alrededor.",
"Participo en actividades o grupos donde me siento valorado/a.",
"Ofrezco apoyo y escucha a las personas cercanas cuando lo necesitan.",
"Dedico tiempo a la reflexión, meditación o silencio interior.",
"Practico la gratitud de manera frecuente.","Me siento conectado con mis valores y propósito de vida.",
"Encuentro serenidad en momentos difíciles."
];
const opciones=["Nunca","Rara vez","A veces","Frecuentemente","Siempre"];

// Renderizar encuesta
const surveyDiv=document.getElementById("survey-questions");
preguntas.forEach((preg,i)=>{
  const div=document.createElement("div"); div.classList.add("survey-question");
  div.innerHTML=`<p>${i+1}. ${preg}</p>`;
  opciones.forEach((opt,j)=>{ div.innerHTML+=`<label><input type="radio" name="q${i}" value="${j+1}"> ${opt}</label>`; });
  surveyDiv.appendChild(div);
});

// Registro y login
async function registerUser(){
  const email=document.getElementById("registerEmail").value;
  const password=document.getElementById("registerPassword").value;
  if(!email||!password){alert("Correo y contraseña requeridos");return;}
  const res=await fetch(`${API_URL}/register`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const data=await res.json(); alert(data.message);
}

async function loginUser(){
  const email=document.getElementById("loginEmail").value;
  const password=document.getElementById("loginPassword").value;
  const res=await fetch(`${API_URL}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const data=await res.json();
  if(data.success){
    token=data.token; localStorage.setItem("token",token);
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("not-logged").classList.add("hidden");
    document.getElementById("logged-in").classList.remove("hidden");
    document.getElementById("logged-as").innerText=`Logueado como: ${email}`;
    document.getElementById("survey-card").classList.remove("hidden");
    cargarEstadisticas();
  } else alert(data.message);
}

// Logout
document.getElementById("btn-logout").addEventListener("click",()=>{
  token=null; localStorage.removeItem("token");
  document.getElementById("logged-in").classList.add("hidden");
  document.getElementById("not-logged").classList.remove("hidden");
  document.getElementById("survey-card").classList.add("hidden");
});

// Mostrar login
document.getElementById("btn-show-login").addEventListener("click",()=>{
  document.getElementById("login-form").classList.remove("hidden");
  document.getElementById("not-logged").classList.add("hidden");
});
document.getElementById("btn-cancel-login").addEventListener("click",()=>{
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("not-logged").classList.remove("hidden");
});

// Enviar encuesta
async function enviarEncuesta(){
  if(!token){alert("Debes iniciar sesión"); return;}
  const edad=parseInt(document.getElementById("edad").value);
  if(!edad){alert("Ingresa tu edad"); return;}
  let score=0;
  for(let i=0;i<preguntas.length;i++){
    const sel=document.querySelector(`input[name=q${i}]:checked`);
    if(sel) score+=parseInt(sel.value);
  }
  let level="Bajo", message="Necesitas mejorar tu autocuidado.";
  if(score>50&&score<=80){level="Medio"; message="Tienes un buen nivel de autocuidado. Sigue así.";}
  else if(score>80){level="Alto"; message="¡Excelente autocuidado!";}
  const res=await fetch(`${API_URL}/submit`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({edad,score,level})});
  const data=await res.json(); alert(`${data.message}\nNivel: ${level}\n${message}`);
  cargarEstadisticas();
}

// Estadísticas
async function cargarEstadisticas(){
  const res=await fetch(`${API_URL}/stats`); const data=await res.json();
  if(data.message){document.getElementById("stats-summary").innerText="No hay datos"; return;}
  document.getElementById("stats-summary").innerHTML=`<p>Total: ${data.total}</p><p>Bajo: ${data.bajo}</p><p>Medio: ${data.medio}</p><p>Alto: ${data.alto}</p><p>Promedio: ${data.promedio}</p>`;
  renderGraficos();
}

// Graficos
async function renderGraficos(){
  const res = await fetch(`${API_URL}/all`);
  const encuestas = await res.json();
  if(!encuestas || encuestas.length == 0) return;

  // === Gráfico de niveles (Barras) ===
  const niveles = {Bajo:0, Medio:0, Alto:0};
  encuestas.forEach(e => niveles[e.level] ? niveles[e.level]++ : niveles[e.level] = 1);

  const ctxNivel = document.getElementById("graficoNivel").getContext("2d");
  new Chart(ctxNivel, {
    type: "bar", // Cambio a barras
    data: {
      labels: ["Bajo", "Medio", "Alto"],
      datasets: [{
        label: "Número de encuestas por nivel",
        data: [niveles.Bajo, niveles.Medio, niveles.Alto],
        backgroundColor: ["#f87171","#facc15","#4ade80"],
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero:true, title:{display:true,text:"Cantidad"} },
        x: { title:{display:true,text:"Nivel"} }
      }
    }
  });

  // === Gráfico de promedios por edad ===
  const edades = {};
  let minEdad = Infinity, maxEdad = -Infinity;
  encuestas.forEach(e => {
    if(!edades[e.edad]) edades[e.edad] = [];
    edades[e.edad].push(e.score);
    if(e.edad < minEdad) minEdad = e.edad;
    if(e.edad > maxEdad) maxEdad = e.edad;
  });

  const edadesLabels = [];
  const promedios = [];
  for(let edad = minEdad; edad <= maxEdad; edad++){
    edadesLabels.push(edad);
    if(edades[edad]){
      const arr = edades[edad];
      promedios.push(arr.reduce((a,b)=>a+b,0)/arr.length);
    } else {
      promedios.push(0); // Si no hay datos, se muestra 0
    }
  }

  const ctxEdad = document.getElementById("graficoEdad").getContext("2d");
  new Chart(ctxEdad, {
    type: "line",
    data: {
      labels: edadesLabels,
      datasets: [{
        label: "Promedio de Puntaje por Edad",
        data: promedios,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.2)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero:true, title:{display:true,text:"Puntaje promedio"} },
        x: { title:{display:true,text:"Edad"} }
      }
    }
  });
}

// Mapa interactivo
document.querySelectorAll(".map-area").forEach(area=>{
  area.addEventListener("click",()=>{
    const action=area.dataset.action;
    const areaName=area.dataset.area;
    const display=document.getElementById("map-action");
    display.innerHTML=`<strong>${areaName}:</strong> ${action}`;
    display.classList.remove("hidden");
  });
});

// Eventos al cargar
window.addEventListener("DOMContentLoaded",()=>{
  if(token){
    document.getElementById("logged-in").classList.remove("hidden");
    document.getElementById("not-logged").classList.add("hidden");
    document.getElementById("survey-card").classList.remove("hidden");
    cargarEstadisticas();
  }
  document.getElementById("btn-register").addEventListener("click",e=>{e.preventDefault(); registerUser();});
  document.getElementById("btn-login").addEventListener("click",e=>{e.preventDefault(); loginUser();});
  document.getElementById("btn-submit").addEventListener("click",e=>{e.preventDefault(); enviarEncuesta();});
});
