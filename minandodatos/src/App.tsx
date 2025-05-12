import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Main from './components/Main'
import MinMax from './components/MinMax'
import Discretizacion from './components/Discretizacion'
import KNN from './components/K-nn'

function App() {
  return (
    <Router basename='/MineriaDatos-BUAP'>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/min-max" element={<MinMax />} />
        <Route path="/discretizacion-fronteras" element={<Discretizacion />} />
        <Route path="/k-nn" element={<KNN />} />
        
      </Routes>
    </Router>
  )
}

export default App
