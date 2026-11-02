// src/App.js
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <div className="App">
      {/* BrowserRouter provides routing for your app */}
      <BrowserRouter>
        {/* AuthProvider makes authentication state available throughout your app */}
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
