import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Interfaces para tipos de datos
interface DataItem {
  features: (number | string)[];
  class: number | string;
}

interface KNNParams {
  k: number;
  trainingData: DataItem[];
  testData: DataItem[];
  accuracy: number;
  ranges: number[]; // Mantener solo para normalización
}


function KNN() {
  const [params, setParams] = useState<KNNParams>({
    k: 5,
    trainingData: [],
    testData: [],
    accuracy: 0,
    ranges: [],
  });
  const [showResults, setShowResults] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [ , setConfusionMatrix] = useState<any[][]>([]);
  const [trainingFileName, setTrainingFileName] = useState<string>('');
  const [testFileName, setTestFileName] = useState<string>('');
  const navigate = useNavigate();

  // Detectar tipos de columna cuando cambian los datos
  useEffect(() => {
    if (params.trainingData.length > 0) {
    }
  }, [params.trainingData]);

  // Parsear datos como numéricos
  const parseDataWithHeader = (
    lines: string[]
  ): DataItem[] => {
    const data: DataItem[] = [];
    
    lines.forEach(line => {
      if (line.trim() === '') return;
      
      const values = line.split(',').map(val => val.trim());
      if (values.length === 0) return;
      
      const classColumnIndex = values.length - 1; // Siempre última columna
      
      const item: DataItem = {
        features: [],
        class: ''
      };
      
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        // Intentar convertir a número, pero preservar valor original si falla
        const parsedVal = val === '' || val === 'NA' || val === '?' 
          ? 0 // Valores faltantes como 0 para datos numéricos
          : isNaN(Number(val)) ? val : Number(val);
      
        if (i === classColumnIndex) {
          item.class = parsedVal;
        } else {
          item.features.push(parsedVal);
        }
      }
    
      data.push(item);
    });
  
    return data;
  };

  // Función para cargar archivos 
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isTraining: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (isTraining) setTrainingFileName(file.name);
    else setTestFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result;
      if (typeof fileContent === 'string') {
        const lines = fileContent.trim().split('\n');
        
        // Ignorar primera línea (header)
        const parsedData = parseDataWithHeader(lines.slice(1));
        
        // Solo calcular rangos para datos de entrenamiento
        if (isTraining) {
          const ranges = calculateNumericRanges(parsedData);
          setParams({
            ...params,
            ranges: ranges,
            trainingData: parsedData
          });
        } else {
          setParams({
            ...params,
            testData: parsedData
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Cargar archivo de entrenamiento
  const handleTrainingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e, true);
  };

  // Cargar archivo de prueba
  const handleTestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e, false);
  };


  // Calcular distancia HEOM (Heterogeneous Euclidean-Overlap Metric)
  const calculateHEOM = (a: DataItem, b: DataItem): number => {
    let sum = 0;
    let validFeatures = 0;
    
    // Solo iterar sobre las características, no sobre la clase
    for (let i = 0; i < Math.min(a.features.length, b.features.length); i++) {
      const featureA = a.features[i];
      const featureB = b.features[i];
      
      // Manejar valores faltantes
      if (featureA === '' || featureA === 'NA' || featureA === '?' ||
          featureB === '' || featureB === 'NA' || featureB === '?') {
        sum += 1; // Distancia máxima para valores faltantes
      } else {
        // Intentar convertir a número
        const numA = Number(featureA);
        const numB = Number(featureB);
        
        if (!isNaN(numA) && !isNaN(numB)) {
          // Ambos son numéricos, usar distancia normalizada
          const range = params.ranges[i] || 1;
          const normalizedDiff = range !== 0 ? Math.abs(numA - numB) / range : 0;
          sum += normalizedDiff * normalizedDiff;
        } else {
          // Al menos uno es categórico, usar comparación de igualdad
          sum += featureA === featureB ? 0 : 1;
        }
      }
      
      validFeatures++;
    }
    
    return validFeatures > 0 ? Math.sqrt(sum / validFeatures) : 1;
  };

  // Algoritmo k-NN 
  const knn = (item: DataItem, k: number): any => {
    // Calcular distancias a cada instancia de entrenamiento
    const distances = params.trainingData.map(trainingItem => ({
      item: trainingItem,
      distance: calculateHEOM(item, trainingItem)
    }));
    
    // Ordenar por distancia (ascendente)
    distances.sort((a, b) => a.distance - b.distance);
    
    // Tomar k vecinos más cercanos
    const kNearest = distances.slice(0, k);
    
    // Contar ocurrencias de cada clase
    const classCounts: { [key: string]: number } = {};
    kNearest.forEach(neighbor => {
      const neighborClass = String(neighbor.item.class);
      classCounts[neighborClass] = (classCounts[neighborClass] || 0) + 1;
    });
    
    // Encontrar la clase mayoritaria
    let maxCount = 0;
    let predictedClass: any = null;
    
    for (const cls in classCounts) {
      if (classCounts[cls] > maxCount) {
        maxCount = classCounts[cls];
        predictedClass = cls;
      }
    }
    
    // Mantener mismo tipo que el original si es posible
    return !isNaN(Number(predictedClass)) && typeof item.class === 'number' 
      ? Number(predictedClass) 
      : predictedClass;
  };

  // Ejecutar clasificación k-NN
  const runKNN = () => {
    if (params.trainingData.length === 0 || params.testData.length === 0) {
      alert('Por favor cargue los archivos de entrenamiento y prueba.');
      return;
    }
    
    const predictions: any[] = [];
    let correctPredictions = 0;
    
    // Clasificar cada instancia de prueba
    params.testData.forEach(testItem => {
      const predictedClass = knn(testItem, params.k);
      const isCorrect = String(testItem.class) === String(predictedClass);
      
      predictions.push({
        actual: testItem.class,
        predicted: predictedClass,
        correct: isCorrect
      });
      
      if (isCorrect) {
        correctPredictions++;
      }
    });
    
    // Calcular exactitud
    const accuracy = (correctPredictions / params.testData.length) * 100;
    
    setParams({
      ...params,
      accuracy: accuracy
    });
    setPredictions(predictions);
    calculateConfusionMatrix(predictions);
    setShowResults(true);
  };

  // Calcular matriz de confusión
  const calculateConfusionMatrix = (predictions: any[]) => {
    const allClasses = new Set<string | number>();
    
    predictions.forEach(pred => {
      allClasses.add(pred.actual);
      allClasses.add(pred.predicted);
    });
    
    const uniqueClasses = Array.from(allClasses).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    
    // Matriz de confusión
    const matrix: number[][] = Array(uniqueClasses.length)
      .fill(0)
      .map(() => Array(uniqueClasses.length).fill(0));
    
    predictions.forEach(prediction => {
      const actualIndex = uniqueClasses.indexOf(prediction.actual);
      const predictedIndex = uniqueClasses.indexOf(prediction.predicted);
      
      if (actualIndex >= 0 && predictedIndex >= 0) {
        matrix[actualIndex][predictedIndex]++;
      }
    });
    
    // Agregar etiquetas
    const labeledMatrix = uniqueClasses.map((cls, i) => {
      return [cls, ...matrix[i]];
    });
    
    labeledMatrix.unshift(['', ...uniqueClasses]);
    
    setConfusionMatrix(labeledMatrix);
  };

  // Manejar cambios en parámetros
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'k') {
      const k = parseInt(value);
      if (k >= 1) {
        setParams({
          ...params,
          k: k
        });
      }
    }
  };

  // Calcular rangos para normalización
  const calculateNumericRanges = (data: DataItem[]): number[] => {
    // Determinar número de features basado en primera instancia
    if (data.length === 0 || data[0].features.length === 0) {
      return [];
    }
    
    const numFeatures = data[0].features.length;
    const ranges: number[] = Array(numFeatures).fill(0);
    
    for (let j = 0; j < numFeatures; j++) {
      let min = Number.MAX_VALUE;
      let max = Number.MIN_VALUE;
      let foundValue = false;
      
      data.forEach(item => {
        if (j < item.features.length) {  // Asegurarse de que el índice es válido
          const val = item.features[j];
          if (val !== '' && !isNaN(Number(val))) {
            const numVal = Number(val);
            min = Math.min(min, numVal);
            max = Math.max(max, numVal);
            foundValue = true;
          }
        }
      });
      
      ranges[j] = foundValue ? max - min : 1; // Usar 1 como valor por defecto para evitar divisiones por cero
    }
    
    return ranges;
  };

  return (
    <div className="container">
      <h1>K-NN</h1>
      <div className="header">
        <button onClick={() => navigate('/')}>Regresar</button>
      </div>
      
      <div className="configuration">
        <h2>Configuración</h2>
        
        <div className="param-group">
          <label htmlFor="k">Valor de k: </label>
          <input
            type="number"
            id="k"
            name="k"
            min="1"
            value={params.k}
            onChange={handleParamChange}
          />
          <small>(Vecinos a considerar)</small>
        </div>
      </div>
      
      <div className="file-section">
        <h2>Cargar datos</h2>
        
        <div className="file-input">
          <label htmlFor="trainingFile">Archivo de entrenamiento (T): </label>
          <input
            type="file"
            id="trainingFile"
            accept=".txt,.csv"
            onChange={handleTrainingFileChange}
          />
          {trainingFileName && <span className="file-info">Archivo: {trainingFileName}</span>}
        </div>
        
        <div className="file-input">
          <label htmlFor="testFile">Archivo de prueba (P): </label>
          <input
            type="file"
            id="testFile"
            accept=".txt,.csv"
            onChange={handleTestFileChange}
          />
          {testFileName && <span className="file-info">Archivo: {testFileName}</span>}
        </div>
      </div>
      
      <div className="action-buttons">
        <button
          onClick={runKNN}
          disabled={params.trainingData.length === 0 || params.testData.length === 0}
          className="run-button"
        >
          Ejecutar k-NN
        </button>
      </div>
      
      {showResults && (
        <div className="results">
          <h2>Resultados</h2>
          
          <div className="accuracy">
            <h3>Métricas de rendimiento</h3>
            <p><strong>Exactitud (Accuracy):</strong> {params.accuracy.toFixed(2)}%</p>
            <p><strong>Error:</strong> {(100 - params.accuracy).toFixed(2)}%</p>
          </div>
          
          {/* <div className="confusion-matrix">
            <h3>Matriz de Confusión</h3>
            <table>
              <thead>
                <tr>
                  <th colSpan={confusionMatrix[0]?.length}>
                    Clase Real (filas) vs. Clase Predicha (columnas)
                  </th>
                </tr>
              </thead>
              <tbody>
                {confusionMatrix.map((row, idx) => (
                  <tr key={idx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div> */}
          
          <div className="prediction-details">
            <h3>Detalle de Predicciones</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Clase Real</th>
                  <th>Clase Predicha</th>
                  <th>¿Correcto?</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred, idx) => (
                  <tr key={idx} className={pred.correct ? "correct" : "incorrect"}>
                    <td>{idx + 1}</td>
                    <td>{pred.actual}</td>
                    <td>{pred.predicted}</td>
                    <td>{pred.correct ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default KNN;