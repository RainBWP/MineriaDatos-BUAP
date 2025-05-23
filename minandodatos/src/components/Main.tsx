// default page
import { useNavigate } from 'react-router-dom';


function Main() {
  const navigate = useNavigate();



    return (
        <div>
        <h1>Proyecto Mineria de Datos</h1>
        <div className='buttons'>
            <button onClick={() => navigate('/min-max')}>
                Min Max
            </button>
            <button onClick={() => navigate('/discretizacion-fronteras')}>
                Discretización
            </button>
            <button onClick={() => navigate('/k-nn')}>
                K-NN
            </button>
            
            <button onClick={() => navigate('/comparador')}>
                Comparador K-NN con FeedForward
            </button>
            
            <button onClick={() => navigate('/old-min-max')}>
                oldMinMax
            </button>
            <button onClick={() => navigate('/old-discretizacion')}>
                oldDiscretizacion
            </button>
        </div>
        </div>
    );
}
export default Main;