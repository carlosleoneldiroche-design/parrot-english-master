# ParrotAI - Master English

ParrotAI es una aplicación gamificada para el aprendizaje de idiomas, inspirada en Duolingo, impulsada por los modelos más avanzados de Google Gemini AI.

## Características Principales

- **Ruta de Aprendizaje Interactiva**: Progresa a través de unidades temáticas con lecciones generadas dinámicamente.
- **Práctica de Pronunciación**: Evaluación en tiempo real de tu habla con feedback fonético detallado.
- **AI Talk (Conversación en Vivo)**: Practica situaciones reales (aeropuerto, restaurante, etc.) con el modelo Gemini 2.5 Flash Native Audio.
- **Laboratorio de Video**: Genera animaciones con Veo 3.1 y analiza videos educativos con Gemini 3 Pro.
- **Economía Gamificada**: Gana gemas y "GCD COIN", una criptomoneda educativa simulada en la red Polygon.
- **Tienda y Personalización**: Personaliza a Parrot con diferentes trajes generados por IA.

## Tecnologías

- **React 19**
- **Tailwind CSS**
- **Google Gemini API** (@google/genai)
  - Gemini 3 Flash (Ejercicios y Chat)
  - Gemini 2.5 Flash Audio (Conversación fluida)
  - Gemini 2.5 Flash Image (Generación de Mascotas)
  - Veo 3.1 (Generación de Video)

## Estructura del Proyecto

- `/components`: Elementos de la interfaz de usuario.
- `/services`: Integraciones con la API de Gemini.
- `types.ts`: Definiciones de tipos para todo el ecosistema.
- `App.tsx`: Orquestador principal de la aplicación.
