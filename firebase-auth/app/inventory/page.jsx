'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/app/firebase/config';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FaHome, FaPlus, FaStore, FaSignOutAlt, FaEllipsisV } from 'react-icons/fa';
import { signOut } from 'firebase/auth';

function ManagerDashboard() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [userSession, setUserSession] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [shelves, setShelves] = useState([]);
  const [showShelfOptions, setShowShelfOptions] = useState(null); // Shelf options state
  const [editingShelf, setEditingShelf] = useState(null);
  const [newShelfName, setNewShelfName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [itemInputState, setItemInputState] = useState({});
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [currentShelfId, setCurrentShelfId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [editingStore, setEditingStore] = useState(null); // Edit store state
  const [showStoreOptions, setShowStoreOptions] = useState(null); // Store options state
  const [isAddShelfModalOpen, setIsAddShelfModalOpen] = useState(false);
  const [shelfItems, setShelfItems] = useState([{ name: '', quantity: '' }]);
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  
  

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const storeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStores(storeData);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      const unsub = onSnapshot(
        collection(db, 'stores', selectedStore, 'shelves'),
        (snapshot) => {
          const shelvesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            items: [], // Initialize items to avoid undefined
          }));
          setShelves(shelvesData);

          // Listen for real-time updates to each shelf's items
          shelvesData.forEach(shelf => {
            const itemsUnsub = onSnapshot(
              collection(db, 'stores', selectedStore, 'shelves', shelf.id, 'items'),
              (itemsSnapshot) => {
                setShelves(prevShelves => 
                  prevShelves.map(s => 
                    s.id === shelf.id 
                      ? { ...s, items: itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) } 
                      : s
                  )
                );
              }
            );
          });
        }
      );
      return () => unsub();
    }
  }, [selectedStore]);

  const createStore = async () => {
    if (newStoreName) {
      await addDoc(collection(db, 'stores'), {
        name: newStoreName,
      });
      setNewStoreName('');
    }
  };

  const updateShelfName = async (shelfId) => {
    const shelfRef = doc(db, 'stores', selectedStore, 'shelves', shelfId);
    await updateDoc(shelfRef, { name: newShelfName });
    setEditingShelf(null);
    setNewShelfName('');
  };

  const updateStoreName = async (storeId) => {
    const storeRef = doc(db, 'stores', storeId);
    await updateDoc(storeRef, { name: newStoreName });
    setEditingStore(null);
    setNewStoreName('');
  };

  const deleteShelf = async (shelfId) => {
    if (confirm("Are you sure you want to delete this shelf?")) {
      const shelfRef = doc(db, 'stores', selectedStore, 'shelves', shelfId);
      await deleteDoc(shelfRef);
    }
  };

  const addItemToShelf = async () => {
    if (newItemName && newItemQuantity && currentShelfId) {
      const itemsCollection = collection(db, 'stores', selectedStore, 'shelves', currentShelfId, 'items');
      await addDoc(itemsCollection, {
        name: newItemName,
        quantity: parseInt(newItemQuantity),
      });
      setIsAddItemModalOpen(false);
      setNewItemName('');
      setNewItemQuantity('');
    }
  };

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

  const handleInputChange = (shelfId, field, value) => {
    setItemInputState({
      ...itemInputState,
      [shelfId]: {
        ...itemInputState[shelfId],
        [field]: value,
      },
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('user');
    router.push('/sign-in');
  };

  const openAddItemModal = (shelfId) => {
    setCurrentShelfId(shelfId);
    setIsAddItemModalOpen(true);
  };

  const closeAddItemModal = () => {
    setIsAddItemModalOpen(false);
    setNewItemName('');
    setNewItemQuantity('');
  };

  const openAddShelfModal = () => {
    setIsAddShelfModalOpen(true);
    setShelfItems([{ name: '', quantity: '' }]);
  };

  const closeAddShelfModal = () => {
    setIsAddShelfModalOpen(false);
    setNewShelfName('');
    setShelfItems([{ name: '', quantity: '' }]);
  };

  const addShelf = async () => {
    if (newShelfName && shelfItems.length > 0) {
      const shelfDoc = await addDoc(collection(db, 'stores', selectedStore, 'shelves'), {
        name: newShelfName,
      });

      const itemsCollection = collection(db, 'stores', selectedStore, 'shelves', shelfDoc.id, 'items');
      for (let item of shelfItems) {
        if (item.name && item.quantity) {
          await addDoc(itemsCollection, {
            name: item.name,
            quantity: parseInt(item.quantity),
          });
        }
      }

      closeAddShelfModal();
    }
  };

  const handleShelfItemChange = (index, field, value) => {
    const updatedItems = [...shelfItems];
    updatedItems[index][field] = value;
    setShelfItems(updatedItems);
  };

  const addNewShelfItem = () => {
    setShelfItems([...shelfItems, { name: '', quantity: '' }]);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Side Navigation Bar */}
      <nav className="w-64 bg-white shadow-lg flex flex-col justify-between">
        <div className="flex flex-col p-4 space-y-4">
          {/* Navbar Logo/Image */}
          <div className="flex justify-center mb-4">
            <img 
              src="/Images/blackbrewlogo.png" 
              alt="Logo"
              className="w-28 h-28 object-contain"
            />
          </div>
          <button className="flex items-center p-2 text-black hover:bg-gray-200 rounded" onClick={() => setSelectedStore('')}>
            <FaHome className="mr-2" /> Home
          </button>
          {stores.map(store => (
            <div key={store.id} className="relative">
              <button
                className={`flex items-center p-2 text-black hover:bg-gray-200 rounded ${selectedStore === store.id ? 'bg-gray-200' : ''}`}
                onClick={() => setSelectedStore(store.id)}
              >
                <FaStore className="mr-2" /> {editingStore === store.id ? (
                  <input
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    onBlur={() => updateStoreName(store.id)}
                    className="text-black border-b-2 focus:outline-none"
                  />
                ) : (
                  store.name
                )}
              </button>
              <button
                className="absolute right-2 top-2 text-gray-700 hover:text-gray-500 focus:outline-none dropdown-button"
                onClick={() => setShowStoreOptions(showStoreOptions === store.id ? null : store.id)}
              >
                <FaEllipsisV />
              </button>
              {showStoreOptions === store.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10 dropdown-button">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setEditingStore(store.id)}
                  >
                    Edit Store Name
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-4">
          {/* Add Store Button */}
          <button
            className="flex items-center p-2 text-black bg-blue-500 hover:bg-blue-600 text-white rounded w-full justify-center"
            onClick={() => setIsAddStoreModalOpen(true)}
          >
            <FaPlus className="mr-2" /> Add Store
          </button>
          {/* Logout Button */}
          <button
            className="flex items-center p-2 text-black bg-red-500 hover:bg-red-600 text-white rounded mt-4 w-full justify-center"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="mr-2" /> Logout
          </button>
        </div>
      </nav>
  
      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {!selectedStore ? (
          <div className="text-center text-gray-700 flex items-center justify-center min-h-screen">
            <div>
              <img 
                src="/images/blackbrewnamelogo.png" 
                alt="Logo"
                className="mx-auto w-40 h-40 mb-6" 
              />
              <h1 className="text-3xl font-semibold">Da Black Brew Inventory</h1>
              <p className="mt-4">Select a store from the navigation bar to manage its inventory.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-3xl font-semibold mb-8 text-black">Store: {stores.find(store => store.id === selectedStore)?.name}</div>
            {/* Shelves Container */}
            <div className="bg-white p-6 shadow-lg rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Add Shelf Card */}
                <div
                  className="bg-gray-100 p-6 shadow rounded-lg flex items-center justify-center cursor-pointer"
                  onClick={openAddShelfModal}
                >
                  <div className="text-center">
                    <div className="text-xl font-semibold text-black mb-4">Add Shelf</div>
                    <FaPlus className="text-3xl text-gray-700 mx-auto" />
                  </div>
                </div>
  
                {shelves.map(shelf => (
                  <div
                    key={shelf.id}
                    className="bg-white p-6 shadow rounded-lg relative"
                  >
                    <div className="flex items-center justify-between mb-4">
                      {editingShelf === shelf.id ? (
                        <input
                          type="text"
                          value={newShelfName}
                          onChange={(e) => setNewShelfName(e.target.value)}
                          onBlur={() => updateShelfName(shelf.id)}
                          className="text-xl font-semibold text-black border-b-2 focus:outline-none"
                        />
                      ) : (
                        <div className="text-xl font-semibold text-black">{shelf.name || `Shelf ${shelf.id}`}</div>
                      )}
                      <div className="relative">
                        <button
                          className="text-gray-700 hover:text-gray-500 focus:outline-none dropdown-button"
                          onClick={() => setShowShelfOptions(showShelfOptions === shelf.id ? null : shelf.id)}
                        >
                          <FaEllipsisV />
                        </button>
                        {showShelfOptions === shelf.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10 dropdown-button">
                            <button
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setEditingShelf(shelf.id)}
                            >
                              Edit Name
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => deleteShelf(shelf.id)}
                            >
                              Remove Shelf
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => openAddItemModal(shelf.id)}
                            >
                              Add Item
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
  
                    {shelf.items && shelf.items.length > 0 ? (
                      <ul className="mb-4">
                        {shelf.items.map((item, index) => (
                          <li key={item.id} className="mb-2">
                            <div className="flex justify-between items-center">
                              <div className="text-black">{item.name}</div>
                              <div className="flex items-center space-x-2">
                                <span className="text-black">Qty: {item.quantity}</span>
                                <button
                                  className="bg-gray-700 text-white px-2 py-1 rounded transition-colors duration-200 hover:bg-gray-600 active:bg-gray-800"
                                  onClick={() => incrementItem(shelf.id, item.id, item.quantity)}
                                >
                                  +
                                </button>
                                <button
                                  className="bg-gray-700 text-white px-2 py-1 rounded transition-colors duration-200 hover:bg-gray-600 active:bg-gray-800"
                                  onClick={() => decrementItem(shelf.id, item.id, item.quantity)}
                                >
                                  -
                                </button>
                              </div>
                            </div>
                            <hr className="border-t border-gray-300 mt-2" />
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
          </>
        )}
      </div>
  
      {/* Add Store Modal */}
      {isAddStoreModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold text-black mb-4">Add New Store</h2>
            <input
              type="text"
              placeholder="Store Name"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="p-2 border rounded w-full mb-4 text-black"
            />
            <div className="flex justify-between">
              <button
                className="bg-gray-700 text-white px-4 py-2 rounded transition-colors duration-200 hover:bg-gray-600 active:bg-gray-800"
                onClick={createStore}
              >
                Add Store
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded transition-colors duration-200 hover:bg-red-600"
                onClick={() => setIsAddStoreModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* Add Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-semibold text-black mb-4">Add Item to Shelf</h2>
            <input
              type="text"
              placeholder="Item Name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="p-2 border rounded w-full mb-4 text-black"
            />
            <input
              type="number"
              placeholder="Item Quantity"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              className="p-2 border rounded w-full mb-4 text-black"
            />
            <div className="flex justify-between">
              <button
                className="bg-gray-700 text-white px-4 py-2 rounded transition-colors duration-200 hover:bg-gray-600 active:bg-gray-800"
                onClick={addItemToShelf}
              >
                Add Item
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded transition-colors duration-200 hover:bg-red-600"
                onClick={closeAddItemModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* Add Shelf Modal */}
      {isAddShelfModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-semibold text-black mb-4">Add New Shelf</h2>
            <input
              type="text"
              placeholder="Shelf Name"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              className="p-2 border rounded w-full mb-4 text-black"
            />
            {shelfItems.map((item, index) => (
              <div key={index} className="mb-4">
                <input
                  type="text"
                  placeholder={`Item Name ${index + 1}`}
                  value={item.name}
                  onChange={(e) => handleShelfItemChange(index, 'name', e.target.value)}
                  className="p-2 border rounded w-full mb-2 text-black"
                />
                <input
                  type="number"
                  placeholder={`Item Quantity ${index + 1}`}
                  value={item.quantity}
                  onChange={(e) => handleShelfItemChange(index, 'quantity', e.target.value)}
                  className="p-2 border rounded w-full mb-2 text-black"
                />
              </div>
            ))}
            <button
              className="flex items-center p-2 text-black bg-gray-700 hover:bg-gray-600 text-white rounded mb-4"
              onClick={addNewShelfItem}
            >
              <FaPlus className="mr-2" /> Add Another Item
            </button>
            <div className="flex justify-between">
              <button
                className="bg-gray-700 text-white px-4 py-2 rounded transition-colors duration-200 hover:bg-gray-600 active:bg-gray-800"
                onClick={addShelf}
              >
                Add Shelf
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded transition-colors duration-200 hover:bg-red-600"
                onClick={closeAddShelfModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  

}

export default ManagerDashboard;


