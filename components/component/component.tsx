'use client';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { Camera } from 'react-camera-pro';

export function Component() {
  const [searchTerm, setSearchTerm] = useState('');
  const [pantryItems, setPantryItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    expirationDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const [user, setUser] = useState(null);
  const camera = useRef(null);
  const [image, setImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      
      if (!authUser) {
        router.push('/signin');
      } else {
        setUser(authUser);
        fetchPantryItems(authUser.uid);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchPantryItems = async (userId) => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/pantryItems`));
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPantryItems(items);
    } catch (error) {
      console.error('Error fetching pantry items:', error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleNewItemChange = (e) => {
    setNewItem({
      ...newItem,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddItem = async () => {
    if (!user) return;

    try {
      if (newItem.name === '' || newItem.expirationDate === '') {
        setError('Please fill out all fields.');
        return;
      } else {
        setError('');
        const docRef = await addDoc(collection(db, `users/${user.uid}/pantryItems`), newItem);
        setPantryItems([
          ...pantryItems,
          { id: docRef.id, ...newItem },
        ]);
        setNewItem({
          name: '',
          quantity: 1,
          expirationDate: '',
        });
        setError('');
        alert('Item added successfully!');
      }
    } catch (error) {
      console.error('Error adding new item:', error);
      setError('Error adding new item. Please try again.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/pantryItems`, id));
      setPantryItems(pantryItems.filter((item) => item.id !== id));
      alert('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Error deleting item. Please try again.');
    }
  };

  const handleEditItemClick = (item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleEditItemChange = (e) => {
    setSelectedItem({
      ...selectedItem,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateItem = async () => {
    if (!user || !selectedItem) return;

    try {
      if (selectedItem.quantity === '' || selectedItem.expirationDate === '') {
        setError('Please fill out all fields.');
        return;
      }
      await updateDoc(doc(db, `users/${user.uid}/pantryItems`, selectedItem.id), {
        quantity: selectedItem.quantity,
        expirationDate: selectedItem.expirationDate,
      });
      setPantryItems(pantryItems.map(item =>
        item.id === selectedItem.id ? { ...item, ...selectedItem } : item
      ));
      setIsEditModalOpen(false);
      setSelectedItem(null);
      setError('');
      alert('Item edited successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Error updating item. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCameraClick = () => {
    setIsCameraOpen(true);
  };

  const handleTakePicture = () => {
    const photo = camera.current.takePhoto();
    setImage(photo);
    setIsCameraOpen(false);
  };

  const filteredItems = pantryItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-primary-foreground py-4 px-6 flex items-center justify-between">
        <div className="text-2xl font-bold">Pantry Tracker</div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search pantry..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-primary-foreground/20 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            />
            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
              <div className="h-5 w-5 text-primary-foreground/50" />
            </div>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            Logout
          </Button>
        </div>
      </header>
      <main className="flex-1 bg-background text-foreground p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-card text-card-foreground rounded-md p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">Expires: {item.expirationDate}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="mt-2 text-muted-foreground">Quantity: {item.quantity}</div>
                <div style={{ gap: '2px', display: 'flex' }}>
                  <button
                    className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors"
                    onClick={() => handleEditItemClick(item)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {error && (
          <div className="mt-6 bg-red-100 text-red-700 rounded-md p-4">
            {error}
          </div>
        )}
        <div className="mt-6 bg-card text-card-foreground rounded-md p-4 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Add New Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={newItem.name}
                onChange={handleNewItemChange}
                className="bg-card-foreground/20 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={newItem.quantity}
                onChange={handleNewItemChange}
                className="bg-card-foreground/20 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <Label htmlFor="expirationDate">Expiration Date</Label>
              <Input
                id="expirationDate"
                name="expirationDate"
                type="date"
                value={newItem.expirationDate}
                onChange={handleNewItemChange}
                className="bg-card-foreground/20 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "2px" }}>
            <Button
              onClick={handleAddItem}
              className="mt-4 bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              Add Item
            </Button>
            <Button
              className="mt-4 bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors"
              onClick={handleCameraClick}
            >
              Add by Pic
            </Button>
            <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors">Get Recipes</button>
          </div>
          {image && (
            <div className="mt-4">
              <img src={image} alt="Captured" className="rounded-md" />
            </div>
          )}
        </div>
      </main>
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
          }}
        >
          <h2>Edit Item</h2>
          <TextField
            label="Quantity"
            name="quantity"
            value={selectedItem?.quantity}
            onChange={handleEditItemChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Expiration Date"
            name="expirationDate"
            type="date"
            value={selectedItem?.expirationDate}
            onChange={handleEditItemChange}
            fullWidth
            margin="normal"
          />
          <Button
            onClick={handleUpdateItem}
            className="mt-4 bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            Update Item
          </Button>
        </Box>
      </Modal>
      <Modal
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Camera ref={camera} />
          <Button
            onClick={handleTakePicture}
            className="mt-4 bg-primary text-primary-foreground rounded-md px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            Take Picture
          </Button>
        </Box>
      </Modal>
    </div>
  );
}

export default Component;