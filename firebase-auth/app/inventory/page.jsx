'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/app/firebase/config';
import { collection, doc, onSnapshot } from 'firebase/firestore';

const ManagerDashboard = () => {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [userSession, setUserSession] = useState(null);

  // Ensure sessionStorage is only accessed on the client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = sessionStorage.getItem('user');
      setUserSession(session);
    }
  }, []);

  useEffect(() => {
    if (!user && !userSession) {
      router.push('/sign-in');
    }
  }, [user, userSession, router]);

  const [selectedStore, setSelectedStore] = useState('');
  const [shelves, setShelves] = useState([]);

  useEffect(() => {
    if (selectedStore) {
      const unsub = onSnapshot(
        collection(db, 'stores', selectedStore, 'shelves'),
        (snapshot) => {
          const shelvesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setShelves(shelvesData);
        }
      );
      return () => unsub();
    }
  }, [selectedStore]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="text-3xl font-semibold mb-8 text-black">Manager Dashboard</div>
      <div className="flex space-x-4 mb-8">
        <select
          className="p-2 border rounded text-black"
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
        >
          <option value="">Select Store Location</option>
          <option value="store1">Store 1</option>
          <option value="store2">Store 2</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shelves.map(shelf => (
          <div key={shelf.id} className="bg-white p-6 shadow rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-semibold text-black">{shelf.name || `Shelf ${shelf.id}`}</div>
            </div>
            {shelf.items && shelf.items.length > 0 ? (
              <ul className="mb-4">
                {shelf.items.map(item => (
                  <li key={item.id} className="flex justify-between items-center mb-2">
                    <span className="text-black">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-black">Quantity: {item.quantity}</span>
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => incrementItem(shelf.id, item.id, item.quantity)}
                      >
                        +
                      </button>
                      <button
                        className="bg-red-500 text-white px-2 py-1 rounded"
                        onClick={() => decrementItem(shelf.id, item.id, item.quantity)}
                      >
                        -
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 mb-4">No items in this shelf.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerDashboard;

const incrementItem = async (shelfId, itemId, currentQuantity) => {
  const itemRef = doc(db, 'stores', selectedStore, 'shelves', shelfId, 'items', itemId);
  await updateDoc(itemRef, {
    quantity: currentQuantity + 1,
  });
};

const decrementItem = async (shelfId, itemId, currentQuantity) => {
  if (currentQuantity > 0) {
    const itemRef = doc(db, 'stores', selectedStore, 'shelves', shelfId, 'items', itemId);
    await updateDoc(itemRef, {
      quantity: currentQuantity - 1,
    });
  }
};
