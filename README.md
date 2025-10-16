# Sistema de Pedidos Coffee Break UDESA 🍰☕

Sistema completo para gestión de pedidos de Coffee Break para eventos, con integración Firebase y webhooks para automatización con n8n/Make.

## 🚀 Características

- ✅ 15 tipos de combos diferentes (con opciones Nespresso)
- ✅ Sistema dinámico de selección de bocados por categorías
- ✅ Cálculo automático de precios por asistente
- ✅ Validaciones en tiempo real
- ✅ Integración con Firebase Firestore para persistencia de datos
- ✅ Preparado para webhooks de n8n/Make para automatizaciones
- ✅ Interfaz responsive y moderna con Tailwind CSS
- ✅ Gestión de extras y personal de apoyo

## 📋 Prerrequisitos

- Node.js 18.x o superior
- Cuenta de Vercel (gratuita)
- Proyecto de Firebase configurado
- (Opcional) Instancia de n8n o Make para automatizaciones

## 🛠️ Configuración de Firebase

### 1. Crear un proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Authentication** y activa el método "Anónimo"
4. Habilita **Firestore Database** en modo producción

### 2. Obtener las credenciales de Firebase

1. En la consola de Firebase, ve a Configuración del proyecto
2. En la pestaña "General", busca "Tus apps" y crea una app web
3. Copia la configuración de Firebase que se muestra

### 3. Configurar las reglas de Firestore

En Firestore, ve a "Reglas" y configura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir que los usuarios autenticados lean y escriban sus propios pedidos
    match /artifacts/{appId}/users/{userId}/orders/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 Despliegue en Vercel

### Método 1: Desde GitHub (Recomendado)

1. **Sube el proyecto a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/coffee-break-udesa.git
   git push -u origin main
   ```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Haz clic en "New Project"
   - Importa tu repositorio de GitHub
   - Configura las variables de entorno (ver sección siguiente)
   - Haz clic en "Deploy"

### Método 2: Usando Vercel CLI

1. **Instala Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Instala las dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Despliega:**
   ```bash
   vercel
   ```
   Sigue las instrucciones en pantalla y configura las variables de entorno cuando se te solicite.

## 🔐 Variables de Entorno

En el panel de Vercel, ve a Settings > Environment Variables y añade:

```bash
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_N8N_WEBHOOK_URL=tu_webhook_url (opcional)
VITE_APP_ID=coffee-break-udesa
```

## 🔧 Configuración de n8n/Make (Opcional)

### Para n8n:

1. Crea un nuevo workflow
2. Añade un nodo "Webhook"
3. Configura como POST y copia la URL de producción
4. Añade esa URL en `VITE_N8N_WEBHOOK_URL`

### Ejemplo de workflow n8n:

```json
1. Webhook (Trigger)
2. Google Sheets (Guardar pedido)
3. Gmail (Enviar confirmación)
4. Slack/Telegram (Notificación al equipo)
```

### Para Make:

1. Crea un nuevo escenario
2. Añade un módulo "Webhooks > Custom Webhook"
3. Copia la URL del webhook
4. Añade esa URL en `VITE_N8N_WEBHOOK_URL`

## 📊 Estructura de datos del Webhook

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

## 🔄 Desarrollo local

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/coffee-break-udesa.git
   cd coffee-break-udesa
   ```

2. **Instala dependencias:**
   ```bash
   npm install
   ```

3. **Crea un archivo `.env` basado en `.env.example`:**
   ```bash
   cp .env.example .env
   ```
   Y completa con tus credenciales de Firebase.

4. **Ejecuta el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Abre en tu navegador:**
   ```
   http://localhost:3000
   ```

## 📦 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Vista previa de la build de producción
- `npm run lint` - Ejecuta el linter

## 🎨 Personalización

### Modificar precios y productos:

Edita las constantes en `src/App.jsx`:

```javascript
// Menú de bocados
const menuItems = [
  { type: 'bocadoFactura', name: 'Medialunas (Factura)', price: 100 },
  // ... añade o modifica items
];

// Paquetes/Combos
const packages = [
  { 
    id: 'C1', 
    name: '1. Coffee Break (Simple)', 
    basePrice: 2200,
    // ... modifica precios y configuraciones
  },
];

// Extras/Add-ons
const addons = [
  { name: 'Agua mineral 1.5lts', price: 2100 },
  // ... añade o modifica extras
];
```

## 🐛 Solución de problemas

### Error de Firebase:
- Verifica que las credenciales en las variables de entorno sean correctas
- Asegúrate de que Firestore y Authentication estén habilitados
- Revisa las reglas de seguridad de Firestore

### Error de build en Vercel:
- Asegúrate de que todas las variables de entorno estén configuradas
- Verifica que la versión de Node.js sea compatible (18.x o superior)

### Webhook no funciona:
- Verifica que la URL del webhook sea correcta y accesible
- Revisa los logs en n8n/Make para ver si llegan las peticiones
- Asegúrate de que el webhook acepte peticiones POST con JSON

## 📝 Licencia

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

**Desarrollado con ❤️ para UDESA**
