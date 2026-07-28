import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLQFdlbhbIOFNPG0l7jHQFP5imYQ42m5M",
  authDomain: "memio-605ac.firebaseapp.com",
  projectId: "memio-605ac",
  storageBucket: "memio-605ac.firebasestorage.app",
  messagingSenderId: "568755971989",
  appId: "1:568755971989:web:d4d2c5a98e414bf731789c",
  measurementId: "G-EJEQC6ZT9Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, "ledger"));
  const snapshot = await getDocs(q);
  console.log("Total ledger items:", snapshot.size);

  let cardExpenses = 0;
  let cardExpensesWithCategory = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.type === 'expense' && data.paymentMethod === '카드') {
      cardExpenses++;
      if (data.category && data.category.trim() !== '') {
        cardExpensesWithCategory++;
        console.log("Found Card Expense:", data.date || data.scheduledDate || data.createdAt, data.category, data.amount, data.title);
      }
    }
  });

  console.log("Total card expenses:", cardExpenses);
  console.log("Card expenses with category:", cardExpensesWithCategory);
  process.exit(0);
}

check().catch(console.error);
