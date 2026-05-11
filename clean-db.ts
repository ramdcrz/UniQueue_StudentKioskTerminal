import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from './src/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanTickets() {
  const departments = ['main', 'is', 'som', 'psb'];
  let totalDeleted = 0;

  for (const deptId of departments) {
    const ticketsRef = collection(db, 'departments', deptId, 'tickets');
    const snapshot = await getDocs(ticketsRef);
    console.log(`Found ${snapshot.size} tickets in ${deptId}`);
    
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      totalDeleted++;
    }
    console.log(`Deleted tickets in ${deptId}`);

    const countersRef = collection(db, 'departments', deptId, 'counters');
    const counterSnapshot = await getDocs(countersRef);
    for (const docSnap of counterSnapshot.docs) {
      await updateDoc(docSnap.ref, {
        currentTicketId: null,
        status: 'VACANT'
      });
    }
    console.log(`Reset counters in ${deptId}`);
  }
  
  console.log(`\nSuccessfully deleted a total of ${totalDeleted} tickets.`);
  process.exit(0);
}

cleanTickets().catch(err => {
  console.error("Error cleaning database:", err);
  process.exit(1);
});
