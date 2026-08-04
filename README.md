# ☕ Coffee Break UDESA - Sistema de Pedidos

Sistema completo para gestión de pedidos de Coffee Break para eventos, con integración Firebase y webhooks para automatización con n8n/Make.

## 🚀 Características

- ✅ 15 tipos de combos diferentes (con y sin opciones Nespresso)
- ✅ Sistema dinámico de selección de bocados por categorías
- ✅ Panel `/admin` para editar precios y habilitar/deshabilitar los artículos que se ofrecen dentro de los paquetes
- ✅ Cálculo automático de precios por asistente
- ✅ Validaciones en tiempo real
- ✅ Integración con Firebase Firestore para persistencia de datos
- ✅ Autenticación anónima de Firebase
- ✅ Preparado para webhooks de n8n/Make para automatizaciones
- ✅ Interfaz responsive y moderna con Tailwind CSS
- ✅ Gestión de extras y personal de apoyo

## 📋 Requisitos Previos

- Node.js 18.x o superior
- Cuenta de Vercel (gratuita)
- Proyecto de Firebase configurado
- (Opcional) Instancia de n8n o Make.com para automatizaciones

## 🔥 Configuración de Firebase

### 1. Crear proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombre sugerido: `DAFAPP` o `coffee-break-udesa`

### 2. Habilitar Authentication

1. En el menú lateral, ve a **Build → Authentication**
2. Click en **"Comenzar"**
3. En la pestaña **"Sign-in method"**
4. Habilita el método **"Anónimo"** (toggle a ON)

### 3. Habilitar Firestore Database

1. En el menú lateral, ve a **Build → Firestore Database**
2. Click en **"Crear base de datos"**
3. Selecciona **"Empezar en modo de prueba"**
4. Ubicación recomendada: **southamerica-east1 (São Paulo)**
5. Click en **"Habilitar"**

### 4. Configurar Reglas de Seguridad de Firestore

En Firestore, ve a **"Reglas"** y configura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir crear pedidos sin autenticación
    // Permitir leer pedidos solo a usuarios autenticados
    match /orders/{orderId} {
      allow create: if true;
      allow read: if request.auth != null;
    }
  }
}
```

Click en **"Publicar"**.

### 5. Obtener Credenciales de Firebase

1. En Firebase Console, click en el **ícono de engranaje** ⚙️ → **"Configuración del proyecto"**
2. En la sección **"Tus aplicaciones"**, click en **"</>"** (Web)
3. Nombre de la app: `Coffee Break Web`
4. **NO marques** Firebase Hosting
5. Click en **"Registrar app"**
6. **Copia** toda la configuración `firebaseConfig`

## 🚀 Deploy en Vercel

### Método 1: Deploy desde la interfaz web (Recomendado)

#### Paso 1: Conectar repositorio

1. Ve a [vercel.com](https://vercel.com)
2. Click en **"Add New"** → **"Project"**
3. Importa tu repositorio de GitHub
4. Selecciona `web-daf`

#### Paso 2: Configurar Variables de Entorno

Antes de hacer deploy, expande **"Environment Variables"** y agrega **todas** estas variables:

```bash
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id
VITE_APP_ID=coffee-break-udesa
```

> **⚠️ IMPORTANTE:** Usa los valores del `firebaseConfig` que copiaste de Firebase.

#### Paso 3: Deploy

1. Click en **"Deploy"**
2. Espera 1-2 minutos
3. ¡Tu app estará en línea! 🎉

### Método 2: Deploy con Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Instalar dependencias del proyecto
npm install

# Deploy
vercel

# Seguir las instrucciones y configurar variables de entorno cuando se solicite
```

## 🔧 Variables de Entorno Requeridas

Crea un archivo `.env` en la raíz del proyecto (para desarrollo local):

```bash
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id
VITE_APP_ID=coffee-break-udesa
VITE_N8N_WEBHOOK_URL=tu_webhook_url_opcional
```

> **Nota:** El archivo `.env` no debe subirse a Git (está en `.gitignore`).

## 🤖 Integración con n8n/Make.com (Opcional)

### Configurar Webhook en n8n

1. Crea un nuevo workflow
2. Añade un nodo **"Webhook"**
3. Configura como **POST** y copia la URL de producción
4. Añade esa URL en la variable `VITE_N8N_WEBHOOK_URL`

**Ejemplo de workflow sugerido:**
1. Webhook (Trigger)
2. Google Sheets (Guardar pedido)
3. Gmail (Enviar confirmación)
4. Slack/Telegram (Notificación al equipo)

### Configurar Webhook en Make.com

1. Crea un nuevo escenario
2. Añade un módulo **"Webhooks > Custom Webhook"**
3. Copia la URL del webhook
4. Añade esa URL en la variable `VITE_N8N_WEBHOOK_URL`

### Estructura de Datos Enviados al Webhook

Cuando se realiza un pedido, se envía al webhook:

```json
{
  "orderId": "doc_id_from_firebase",
  "name": "Juan Pérez",
  "email": "juan@udesa.edu.ar",
  "eventDate": "2025-01-15",
  "eventTime": "10:00",
  "attendees": 20,
  "packageName": "3. Coffee Break + 2 Bocados Simples",
  "packagePricePerAttendee": 5200,
  "addons": [
    {
      "name": "Agua mineral 1.5lts",
      "price": 2100,
      "quantity": 5
    }
  ],
  "selectedBocados": {
    "Budin Marmolado (Simple)": 20,
    "Cuadradito Brownie (Simple)": 20
  },
  "totalPrice": 114500,
  "observations": "Necesitamos opciones sin gluten",
  "status": "Pendiente",
  "userId": "firebase_user_id",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

## 💻 Desarrollo Local

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Jonatandobal/web-daf.git
cd web-daf

# Instalar dependencias
npm install

# Crear archivo .env con tus credenciales
cp .env.example .env
# Editar .env con tus credenciales de Firebase

# Ejecutar en desarrollo
npm run dev
```

### Abrir en el navegador

```
http://localhost:5173
```

### Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Vista previa de la build de producción
- `npm run lint` - Ejecuta el linter

## ⚙️ Personalización

### Modificar Menú de Bocados

Edita las constantes en `src/App.jsx`:

```javascript
const menuItems = [
  { type: 'bocadoFactura', name: 'Medialunas (Factura)', price: 100 },
  // ... añade o modifica items
];
```

### Modificar Paquetes/Combos

```javascript
const packages = [
  {
    id: 'C1',
    name: '1. Coffee Break (Simple)',
    basePrice: 2200,
    // ... modifica precios y configuraciones
  },
];
```

### Modificar Extras/Add-ons

```javascript
const addons = [
  { name: 'Agua mineral 1.5lts', price: 2100 },
  // ... añade o modifica extras
];
```

## 🐛 Solución de Problemas

### Firebase no conecta

- Verifica que las credenciales en las variables de entorno sean correctas
- Asegúrate de que Firestore y Authentication estén habilitados en Firebase
- Revisa las reglas de seguridad de Firestore

### Error en Deploy de Vercel

- Asegúrate de que todas las variables de entorno estén configuradas
- Verifica que la versión de Node.js sea compatible (18.x o superior)
- Revisa los logs de build en Vercel

### Webhook no funciona

- Verifica que la URL del webhook sea correcta y accesible
- Revisa los logs en n8n/Make para ver si llegan las peticiones
- Asegúrate de que el webhook acepte peticiones POST con JSON

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + Vite
- **Estilos:** Tailwind CSS
- **Base de Datos:** Firebase Firestore
- **Autenticación:** Firebase Authentication
- **Hosting:** Vercel
- **Automatización:** n8n / Make.com

## 📄 Licencia

Este proyecto está bajo licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Soporte

Para soporte o consultas sobre automatizaciones con n8n/Make, puedes contactar al equipo de desarrollo.

---

Desarrollado con ❤️ para UDESA