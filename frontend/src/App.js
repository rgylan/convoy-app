import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import 'leaflet/dist/leaflet.css';
import Home from './screens/Home';
import JoinConvoy from './screens/JoinConvoy';
import ConvoyMap from './screens/ConvoyMap';
import DebugPanel from './components/DebugPanel';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:convoyId" element={<JoinConvoy />} />
        <Route path="/convoy/:convoyId" element={<ConvoyMap />} />
      </Routes>
      <ToastContainer />
      <DebugPanel />
    </Router>
  );
}

export default App;
