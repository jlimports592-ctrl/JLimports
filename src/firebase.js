import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js';

import { CONFIG } from '../config.js';

export const WHATSAPP_NUMBER = CONFIG.WHATSAPP_NUMBER || '5545998328002';

// Verifica se as credenciais do Firebase foram preenchidas
export const isFirebaseConfigured = Boolean(
  CONFIG.FIREBASE && 
  CONFIG.FIREBASE.apiKey && 
  CONFIG.FIREBASE.apiKey.trim() !== '' &&
  CONFIG.FIREBASE.projectId &&
  CONFIG.FIREBASE.projectId.trim() !== ''
);

let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(CONFIG.FIREBASE);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('Erro ao inicializar Firebase real:', err);
  }
}

export { 
  app, 
  auth, 
  db, 
  storage, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  collection, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
};

// Catálogo de produtos padrão argentino para teste imediato e demonstração
export const PRODUTOS_PADRAO = [
  {
    id: 'demo-1',
    nome: 'Vinho Catena Zapata Malbec Argentino',
    descricao: 'Ícone da viticultura argentina em Mendoza. Notas de frutas vermelhas maduras, baunilha e taninos aveludados.',
    categoria: 'Vinhos',
    preco: 380.00,
    imagem: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    ativo: true,
  },
  {
    id: 'demo-2',
    nome: 'Vinho Angelica Zapata Cabernet Franc Alta',
    descricao: 'Elaborado a partir de vinhedos de altitude em Mendoza. Elegante, complexo e com final persistente.',
    categoria: 'Vinhos',
    preco: 290.00,
    imagem: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=600&q=80',
    ativo: true,
  },
  {
    id: 'demo-3',
    nome: 'Alfajor Havanna Misto (Caixa com 6 unidades)',
    descricao: 'O autêntico e consagrado alfajor argentino. Cobertura de chocolate ao leite e recheio cremoso de doce de leite.',
    categoria: 'Alfajores',
    preco: 85.00,
    imagem: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80',
    ativo: true,
  },
  {
    id: 'demo-4',
    nome: 'Alfajor Rapanui Frambuesas Bañadas (Franui Chocolate ao Leite)',
    descricao: 'Framboesas frescas da Patagônia banhadas em duas camadas generosas de puro chocolate ao leite e branco.',
    categoria: 'Doces',
    preco: 48.00,
    imagem: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80',
    ativo: true,
  },
  {
    id: 'demo-5',
    nome: 'Doce de Leite Colonial La Serenísima Tradicional 400g',
    descricao: 'Clássico doce de leite argentino com textura ultra cremosa e cor caramelo dourada.',
    categoria: 'Produtos Coloniais',
    preco: 36.00,
    imagem: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    ativo: true,
  },
  {
    id: 'demo-6',
    nome: 'Fernet Branca Tradicional 750ml',
    descricao: 'O clássico aperitivo argentino. Destilado com blend secreto de 27 ervas botânicas.',
    categoria: 'Bebidas',
    preco: 79.00,
    imagem: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=600&q=80',
    ativo: true,
  }
];
