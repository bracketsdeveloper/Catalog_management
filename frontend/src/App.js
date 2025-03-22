import React from 'react';
import { Outlet, useNavigation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { ToastContainer } from 'react-toastify';
import { CartProvider } from './context/CartContext';
import { TailSpin } from 'react-loader-spinner';

const Loader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <TailSpin height="80" width="80" color="#ffffff" ariaLabel="loading" />
  </div>
);

function App() {
  const navigation = useNavigation();

  return (
    <CartProvider>
      <ToastContainer />
      <Header />
      {navigation.state === 'loading' && <Loader />}
      <Outlet />
      {/* <Footer /> */}
    </CartProvider>
  );
}

export default App;
