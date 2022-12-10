import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.scss';
import About from './pages/about/about.page';

import Home from './pages/home/home.page';
import Main from './pages/profile/main.page';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app" element={<Main />} />
        <Route path="/about" element={<About />} />
        <Route path="/" element={<Home />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
