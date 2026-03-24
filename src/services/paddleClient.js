const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
const PADDLE_CLIENT_TOKEN = String(import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '').trim();
const IS_PADDLE_SANDBOX = PADDLE_CLIENT_TOKEN.startsWith('test_');

export const PADDLE_PRICE_IDS = {
  monthly: import.meta.env.VITE_PADDLE_PRICE_MONTHLY || 'pri_01kmev9e99c51aa5wed83n61tb',
  annual: import.meta.env.VITE_PADDLE_PRICE_YEARLY || 'pri_01kmevahb7jsagyk491e5m9z8e',
};

let paddleInitPromise;

function loadPaddleScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Paddle solo está disponible en el navegador.'));
      return;
    }

    if (window.Paddle) {
      resolve(window.Paddle);
      return;
    }

    const existingScript = document.querySelector(`script[src="${PADDLE_SCRIPT_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Paddle), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Paddle.js.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Paddle);
    script.onerror = () => reject(new Error('No se pudo cargar Paddle.js.'));
    document.head.appendChild(script);
  });
}

export async function getPaddle() {
  if (!PADDLE_CLIENT_TOKEN) {
    throw new Error(
      'Falta VITE_PADDLE_CLIENT_TOKEN. Agregá el client-side token de Paddle en las variables de entorno.',
    );
  }

  if (!paddleInitPromise) {
    paddleInitPromise = loadPaddleScript().then((Paddle) => {
      if (!Paddle) {
        throw new Error('Paddle.js no quedó disponible en la ventana.');
      }

      if (IS_PADDLE_SANDBOX) {
        Paddle.Environment.set('sandbox');
      }

      Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
      });

      return Paddle;
    });
  }

  return paddleInitPromise;
}

export async function openPaddleCheckout({ priceId, email, userId }) {
  if (!priceId) {
    throw new Error('No encontramos el Price ID de Paddle para este plan.');
  }

  if (!String(priceId).startsWith('pri_')) {
    throw new Error('El Price ID de Paddle no tiene el formato esperado.');
  }

  const Paddle = await getPaddle();
  const customData = {};

  if (userId) {
    customData.userId = userId;
  }

  if (email) {
    customData.email = email;
  }

  Paddle.Checkout.open({
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: 'es',
    },
    items: [
      {
        priceId,
        quantity: 1,
      },
    ],
    customer: email
      ? {
          email,
        }
      : undefined,
    customData: Object.keys(customData).length > 0 ? customData : undefined,
  });
}
