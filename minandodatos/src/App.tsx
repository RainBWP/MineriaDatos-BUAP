import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Main from './components/Main'
import MinMax from './components/MinMax'
import Discretizacion from './components/Discretizacion'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/min-max" element={<MinMax />} />
        <Route path="/discretizacion-fronteras" element={<Discretizacion />} />
      </Routes>
    </Router>
  )
}

export default App
