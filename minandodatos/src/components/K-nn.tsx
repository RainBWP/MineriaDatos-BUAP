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
  columnTypes: ('numeric' | 'categorical')[];
  classColumnIndex: number;
}

function KNN() {
  const navigate = useNavigate();
  const [params, setParams] = useState<KNNParams>({
    k: 3,
    trainingData: [],
    testData: [],
    accuracy: 0,
    columnTypes: [],
    classColumnIndex: -1,
  });
  const [showResults, setShowResults] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [confusionMatrix, setConfusionMatrix] = useState<any[][]>([]);
  const [trainingFileName, setTrainingFileName] = useState<string>('');
  const [testFileName, setTestFileName] = useState<string>('');

  // Detectar tipos de columna cuando cambian los datos
  useEffect(() => {
    if (params.trainingData.length > 0) {
      detectColumnTypes();
    }
  }, [params.trainingData]);

  // Función para detectar automáticamente los tipos de columna
  const detectColumnTypes = () => {
    const data = params.trainingData;
    const newColumnTypes: ('numeric' | 'categorical')[] = [];
    
    if (data.length === 0 || data[0].features.length === 0) return;
    
    for (let i = 0; i < data[0].features.length; i++) {
      let isNumeric = true;
      
      // Verificar si todos los valores son numéricos
      for (let j = 0; j < Math.min(data.length, 10); j++) {
        const value = data[j].features[i];
        if (typeof value === 'string' && isNaN(Number(value)) && 
            value !== '' && value !== 'NA' && value !== '?') {
          isNumeric = false;
          break;
        }
      }
      
      newColumnTypes.push(isNumeric ? 'numeric' : 'categorical');
    }
    
    setParams({
      ...params,
      columnTypes: newColumnTypes
    });
  };

  // Cargar archivo de entrenamiento
  const handleTrainingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTrainingFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent === 'string') {
          const parsedData = parseDataFile(fileContent, params.classColumnIndex);
          setParams({
            ...params,
            trainingData: parsedData,
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // Cargar archivo de prueba
  const handleTestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTestFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent === 'string') {
          const parsedData = parseDataFile(fileContent, params.classColumnIndex);
          setParams({
            ...params,
            testData: parsedData,
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // Parsear archivo de datos
  const parseDataFile = (fileContent: string, classColumnIndex: number): DataItem[] => {
    const lines = fileContent.trim().split('\n');
    const data: DataItem[] = [];
    
    lines.forEach(line => {
      if (line.trim() === '') return; // Ignorar líneas vacías
      
      const values = line.split(',').map(val => val.trim());
      
      // Verificar que hay suficientes valores
      if (classColumnIndex >= values.length) {
        console.warn(`Advertencia: Índice de clase (${classColumnIndex}) fuera de rango`);
        return;
      }
      
      const item: DataItem = {
        features: [],
        class: ''
      };
      
      // Extraer características y clase
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        
        if (i === classColumnIndex) {
          item.class = isNaN(Number(val)) || val === '' ? val : Number(val);
        } else {
          // Agregar a features solo si no es la columna de clase
          const parsedVal = isNaN(Number(val)) || val === '' ? val : Number(val);
          item.features.push(parsedVal);
        }
      }
      
      data.push(item);
    });
    
    return data;
  };

  // Calcular distancia HEOM (Heterogeneous Euclidean-Overlap Metric)
  const calculateHEOM = (a: DataItem, b: DataItem): number => {
    let sum = 0;
    let validFeatures = 0;
    
    for (let i = 0; i < a.features.length; i++) {
      const featureA = a.features[i];
      const featureB = b.features[i];
      
      // Manejar valores faltantes
      if (featureA === '' || featureA === 'NA' || featureA === '?' ||
          featureB === '' || featureB === 'NA' || featureB === '?') {
        sum += 1; // Distancia máxima para valores faltantes
      } else {
        const featureType = params.columnTypes[i];
        
        if (featureType === 'numeric') {
          // Atributos numéricos: distancia euclidiana normalizada
          const numA = Number(featureA);
          const numB = Number(featureB);
          
          if (isNaN(numA) || isNaN(numB)) {
            sum += featureA === featureB ? 0 : 1;
          } else {
            const range = getRange(params.trainingData, i);
            const normalizedDiff = range !== 0 ? Math.abs(numA - numB) / range : 0;
            sum += normalizedDiff * normalizedDiff;
          }
        } else {
          // Atributos categóricos: métrica de overlap
          sum += featureA === featureB ? 0 : 1;
        }
        
        validFeatures++;
      }
    }
    
    return validFeatures > 0 ? Math.sqrt(sum / validFeatures) : 1;
  };

  // Obtener el rango de un atributo numérico
  const getRange = (data: DataItem[], featureIndex: number): number => {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    let found = false;
    
    data.forEach(item => {
      const feature = item.features[featureIndex];
      if (feature !== '' && feature !== 'NA' && feature !== '?' && 
          !isNaN(Number(feature))) {
        const value = Number(feature);
        if (value < min) min = value;
        if (value > max) max = value;
        found = true;
      }
    });
    
    return found ? max - min : 1;
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
    
    return !isNaN(Number(predictedClass)) ? Number(predictedClass) : predictedClass;
  };

  // Ejecutar clasificación k-NN
  const runKNN = () => {
    if (params.trainingData.length === 0 || params.testData.length === 0) {
      alert('Por favor cargue los archivos de entrenamiento y prueba.');
      return;
    }
    
    if (params.classColumnIndex < 0) {
      alert('Por favor indique la columna de clase.');
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
    } else if (name === 'classColumnIndex') {
      const index = parseInt(value);
      if (index >= 0) {
        setParams({
          ...params,
          classColumnIndex: index
        });
      }
    }
  };

  // Manejar cambios en los tipos de columna
  const handleColumnTypeChange = (index: number, type: 'numeric' | 'categorical') => {
    const newColumnTypes = [...params.columnTypes];
    newColumnTypes[index] = type;
    setParams({
      ...params,
      columnTypes: newColumnTypes
    });
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Clasificador k-NN con HEOM</h1>
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
        
        <div className="param-group">
          <label htmlFor="classColumnIndex">Índice de columna de clase: </label>
          <input
            type="number"
            id="classColumnIndex"
            name="classColumnIndex"
            min="0"
            value={params.classColumnIndex >= 0 ? params.classColumnIndex : ''}
            onChange={handleParamChange}
          />
          <small>(Primer índice es 0)</small>
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
      
      {params.trainingData.length > 0 && (
        <div className="column-types">
          <h2>Tipos de Atributos</h2>
          <p>Verifique que los tipos detectados sean correctos:</p>
          
          <table>
            <thead>
              <tr>
                <th>Atributo</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {params.columnTypes.map((type, index) => (
                <tr key={index}>
                  <td>Atributo {index}</td>
                  <td>
                    <select
                      title={`Select type for attribute ${index}`}
                      value={type}
                      onChange={(e) => handleColumnTypeChange(index, e.target.value as 'numeric' | 'categorical')}
                    >
                      <option value="numeric">Numérico</option>
                      <option value="categorical">Categórico</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="action-buttons">
        <button
          onClick={runKNN}
          disabled={params.trainingData.length === 0 || params.testData.length === 0 || params.classColumnIndex < 0}
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
          
          <div className="confusion-matrix">
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
          </div>
          
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