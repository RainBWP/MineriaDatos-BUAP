import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tf from '@tensorflow/tfjs';

// Interface idéntica a K-nn.tsx
interface DataItem {
  features: (number | string)[];
  class: number | string;
}

interface ComparacionParams {
  k: number; // Un solo valor de k
  trainingData: DataItem[];
  testData: DataItem[];
  kFolds: number; // número de folds para validación cruzada
  ranges: number[]; // rangos para normalización
  results: {
    knn: { accuracy: number };
    neuralNetwork: { accuracy: number };
  };
}

function Comparador() {
  const navigate = useNavigate();
  const [showTrainingData, setShowTrainingData] = useState(false);
  const [showTestData, setShowTestData] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingFileName, setTrainingFileName] = useState<string>('');
  const [testFileName, setTestFileName] = useState<string>('');
  const [params, setParams] = useState<ComparacionParams>({
    k: 5, // Valor por defecto
    trainingData: [],
    testData: [],
    kFolds: 1, // Sin validación cruzada por defecto
    ranges: [],
    results: {
      knn: { accuracy: 0 },
      neuralNetwork: { accuracy: 0 }
    }
  });

  // Parsear datos exactamente como en K-nn.tsx
  const parseDataWithHeader = (lines: string[]): DataItem[] => {
    const data: DataItem[] = [];
    
    // Saltamos la primera línea (encabezado)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      
      const values = line.split(',').map(val => val.trim());
      if (values.length === 0) continue;
      
      const classColumnIndex = values.length - 1; // Siempre última columna
      
      const item: DataItem = {
        features: [],
        class: ''
      };
      
      for (let j = 0; j < values.length; j++) {
        const val = values[j];
        // Intentar convertir a número, pero preservar valor original si falla
        const parsedVal = val === '' || val === 'NA' || val === '?' 
          ? 0 // Valores faltantes como 0 para datos numéricos
          : isNaN(Number(val)) ? val : Number(val);
      
        if (j === classColumnIndex) {
          item.class = parsedVal;
        } else {
          item.features.push(parsedVal);
        }
      }
    
      data.push(item);
    }
  
    return data;
  };

  // Calcular rangos para normalización (idéntico a K-nn.tsx)
  const calculateNumericRanges = (data: DataItem[]): number[] => {
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

  // Cargar archivo de entrenamiento
  const handleTrainingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTrainingFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent === 'string') {
          const lines = fileContent.split('\n');
          const parsedData = parseDataWithHeader(lines);
          const ranges = calculateNumericRanges(parsedData);
          
          setParams({
            ...params,
            trainingData: parsedData,
            ranges: ranges
          });
          setShowTrainingData(true);
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
          const lines = fileContent.split('\n');
          const parsedData = parseDataWithHeader(lines);
          
          setParams({
            ...params,
            testData: parsedData
          });
          setShowTestData(true);
        }
      };
      reader.readAsText(file);
    }
  };

  // Manejar cambios en los parámetros
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'k') {
      const k = parseInt(value);
      if (!isNaN(k) && k >= 1) {
        setParams({
          ...params,
          k: k
        });
      }
    } else if (name === 'kFolds') {
      const kFolds = parseInt(value);
      if (!isNaN(kFolds) && kFolds >= 1) {
        setParams({
          ...params,
          kFolds: kFolds
        });
      }
    }
  };

  // Función de distancia HEOM exactamente como en K-nn.tsx
  const calculateHEOM = (a: DataItem, b: DataItem, ranges: number[]): number => {
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
          const range = ranges[i] || 1;
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

  // Algoritmo k-NN exactamente como en K-nn.tsx
  const knn = (item: DataItem, k: number, trainingData: DataItem[], ranges: number[]): any => {
    // Calcular distancias a cada instancia de entrenamiento
    const distances = trainingData.map(trainingItem => ({
      item: trainingItem,
      distance: calculateHEOM(item, trainingItem, ranges)
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

  // Crear y entrenar la red neuronal feedforward
  const trainNeuralNetwork = async (
    trainingData: DataItem[], 
    testData: DataItem[]
  ) => {
    // Extraer features y etiquetas
    const trainingFeatures = trainingData.map(item => {
      // Convertir todos los features a números para la red neuronal
      return item.features.map(feat => {
        if (typeof feat === 'number') return feat;
        return isNaN(Number(feat)) ? 0 : Number(feat); // 0 para valores no numéricos
      });
    });
    
    // Convertir clases a números para la red neuronal
    const uniqueClassLabels = new Set<string>();
    trainingData.forEach(item => uniqueClassLabels.add(String(item.class)));
    const classMapping = new Map<string, number>();
    Array.from(uniqueClassLabels).sort().forEach((cls, idx) => {
      classMapping.set(cls, idx);
    });
    
    const trainingLabels = trainingData.map(item => 
      classMapping.get(String(item.class)) || 0
    );
    
    const testFeatures = testData.map(item => {
      return item.features.map(feat => {
        if (typeof feat === 'number') return feat;
        return isNaN(Number(feat)) ? 0 : Number(feat);
      });
    });
    
    const testLabels = testData.map(item => 
      classMapping.get(String(item.class)) || 0
    );
    
    // Determinar el número de features y clases
    const numFeatures = trainingFeatures[0].length;
    const numClasses = uniqueClassLabels.size;
    
    // Normalizar datos
    const dataMean = tf.mean(tf.tensor2d(trainingFeatures), 0);
    // Compute standard deviation manually since tf.std does not exist in tfjs
    const dataTensor = tf.tensor2d(trainingFeatures);
    const diffSquared = dataTensor.sub(dataMean).square();
    const variance = tf.mean(diffSquared, 0);
    const dataStd = variance.sqrt();
    
    // Función para normalizar
    const normalizeData = (data: number[][]) => {
      return tf.tidy(() => {
        const tensor = tf.tensor2d(data);
        // Evitar división por cero
        const stdTensor = dataStd.add(tf.scalar(1e-6));
        return tensor.sub(dataMean).div(stdTensor);
      });
    };
    
    const xTrain = normalizeData(trainingFeatures);
    const yTrain = tf.oneHot(tf.tensor1d(trainingLabels, 'int32'), numClasses);
    
    const xTest = normalizeData(testFeatures);
    const yTest = tf.oneHot(tf.tensor1d(testLabels, 'int32'), numClasses);

    // Crear modelo secuencial con 3 capas y activación sigmoid
    const model = tf.sequential();
    
    // Primera capa oculta
    model.add(tf.layers.dense({
      units: 16, 
      activation: 'sigmoid',
      inputShape: [numFeatures]
    }));
    
    // Segunda capa oculta
    model.add(tf.layers.dense({
      units: 8,
      activation: 'sigmoid'
    }));
    
    // Capa de salida
    model.add(tf.layers.dense({
      units: numClasses,
      activation: 'softmax'
    }));
    
    // Compilar modelo
    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    // Entrenar modelo
    try {
      await model.fit(xTrain, yTrain, {
        epochs: 50,
        validationData: [xTest, yTest],
        verbose: 0
      });
      
      // Evaluar en conjunto de prueba
      const evaluation = await model.evaluate(xTest, yTest) as tf.Tensor[];
      const accuracy = await evaluation[1].dataSync()[0];
      
      // Liberar tensores
      tf.dispose([xTrain, yTrain, xTest, yTest, dataMean, dataStd]);
      model.dispose();
      
      return accuracy;
    } catch (error) {
      console.error("Error en entrenamiento de red neuronal:", error);
      return 0;
    }
  };

  // Ejecutar comparación
  const runComparison = async () => {
    const { k, trainingData, testData, kFolds, ranges } = params;
    
    if (trainingData.length === 0 || testData.length === 0) {
      alert("Por favor cargue los archivos de entrenamiento y prueba");
      return;
    }
    
    setIsTraining(true);
    
    // Evaluar KNN
    let knnAccuracy = 0;
    
    if (kFolds <= 1) {
      // Si no se usa k-fold, simplemente evaluar con los datos tal cual
      let correctPredictions = 0;
      
      testData.forEach(testItem => {
        const predicted = knn(testItem, k, trainingData, ranges);
        if (String(predicted) === String(testItem.class)) {
          correctPredictions++;
        }
      });
      
      knnAccuracy = correctPredictions / testData.length;
    } else {
      // K-fold cross validation para KNN
      let totalAccuracy = 0;
      const foldSize = Math.floor(trainingData.length / kFolds);
      
      for (let fold = 0; fold < kFolds; fold++) {
        // Dividir datos en entrenamiento y validación para este fold
        const validationStart = fold * foldSize;
        const validationEnd = (fold + 1) * foldSize;
        
        const validationSet = trainingData.slice(validationStart, validationEnd);
        const trainSet = [
          ...trainingData.slice(0, validationStart),
          ...trainingData.slice(validationEnd)
        ];
        
        let correctPredictions = 0;
        
        validationSet.forEach(validationItem => {
          const predicted = knn(validationItem, k, trainSet, ranges);
          if (String(predicted) === String(validationItem.class)) {
            correctPredictions++;
          }
        });
        
        totalAccuracy += correctPredictions / validationSet.length;
      }
      
      knnAccuracy = totalAccuracy / kFolds;
    }
    
    // Entrenar y evaluar la red neuronal feedforward
    let nnAccuracy;
    try {
      nnAccuracy = await trainNeuralNetwork(
        trainingData,
        testData
      );
    } catch (error) {
      console.error("Error en red neuronal:", error);
      nnAccuracy = 0;
    }
    
    setParams({
      ...params,
      results: {
        knn: { accuracy: knnAccuracy },
        neuralNetwork: { accuracy: nnAccuracy }
      }
    });
    
    setIsTraining(false);
  };

  // Renderizar vista previa de datos formateados
// Vista previa simple tipo lista, similar al ejemplo del usuario
const renderDataPreview = (data: DataItem[], count: number) => {
    if (data.length === 0) return null;
    return (
        <div>
            <h4>Vista previa:</h4>
            {data.map((item, idx) => (
                <div key={idx}>
                    {item.features.map((feat, i) => (
                        <span key={i}>
                            {feat}
                            {i < item.features.length - 1 && ', '}
                        </span>
                    ))}
                    <span>, {item.class}</span>
                </div>
            ))}
            {data.length > count && (
                <div>...</div>
            )}
        </div>
    );
};

  return (
    <div>
      <h1>Comparación: KNN vs Red Neuronal Feedforward</h1>
      <button onClick={() => navigate('/')}>Regresar</button>
      
      <div>
        <h2>Configuración</h2>
        
        <div>
          <label htmlFor="trainingFile">Archivo de entrenamiento (T):</label>
          <input 
            type="file" 
            id="trainingFile" 
            accept=".txt,.csv"
            onChange={handleTrainingFileChange}
          />
          {trainingFileName && <span>Archivo cargado: {trainingFileName}</span>}
        </div>
        
        <div>
          <label htmlFor="testFile">Archivo de prueba (P):</label>
          <input 
            type="file" 
            id="testFile" 
            accept=".txt,.csv"
            onChange={handleTestFileChange}
          />
          {testFileName && <span>Archivo cargado: {testFileName}</span>}
        </div>
        
        <div>
          <label htmlFor="k">Valor de k para KNN:</label>
          <input 
            type="number" 
            id="k"  
            name="k"
            value={params.k}
            onChange={handleParamChange}
            min={1}
          />
        </div>
        
        <div>
          <label htmlFor="kFolds">K-Fold Cross Validation (1 = sin validación cruzada):</label>
          <input 
            type="number" 
            id="kFolds"  
            name="kFolds"
            value={params.kFolds}
            onChange={handleParamChange}
            min={1}
            max={10}
          />
        </div>
        
        <div>
          <p><strong>Topología de Red:</strong> 3 capas [16-8-N] con activación sigmoid</p>
          <p><strong>Épocas:</strong> 50</p>
          <p><strong>Optimizador:</strong> Adam</p>
        </div>
        
        <button
          onClick={runComparison}
          disabled={params.trainingData.length === 0 || params.testData.length === 0 || isTraining}>
          {isTraining ? "Procesando..." : "Ejecutar Comparación"}
        </button>
      </div>
      
      {/* Resultados */}
      {(params.results.knn.accuracy > 0 || params.results.neuralNetwork.accuracy > 0) && (
        <div>
          <h2>Resultados de la Comparación</h2>
          
          <div>
            <div>
              <h3>Resultado KNN (k={params.k})</h3>
              <table>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Precisión</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>KNN (k={params.k})</td>
                    <td>{(params.results.knn.accuracy * 100).toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div>
              <h3>Resultado Red Neuronal</h3>
              <table>
                <thead>
                  <tr>
                    <th>Arquitectura</th>
                    <th>Precisión</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>16-8-N (sigmoid)</td>
                    <td>{(params.results.neuralNetwork.accuracy * 100).toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <h3>Análisis Comparativo</h3>
            <p>
              <strong>Resultado KNN:</strong> {
                (params.results.knn.accuracy * 100).toFixed(2)
              }% (k = {params.k})
            </p>
            <p>
              <strong>Resultado Red Neuronal:</strong> {
                (params.results.neuralNetwork.accuracy * 100).toFixed(2)
              }% (arquitectura = 16-8-N)
            </p>
            <p>
              <strong>Ganador:</strong> {
                params.results.knn.accuracy > 
                params.results.neuralNetwork.accuracy
                  ? 'KNN' : 'Red Neuronal'
              }
            </p>
          </div>
        </div>
      )}
      
      {/* Vista previa de datos */}
      {showTrainingData && (
        <div>
          <h3>Vista previa de datos de entrenamiento ({params.trainingData.length} filas)</h3>
          {renderDataPreview(params.trainingData, 5)}
        </div>
      )}
      
      {showTestData && (
        <div>
          <h3>Vista previa de datos de prueba ({params.testData.length} filas)</h3>
          {renderDataPreview(params.testData, 5)}
        </div>
      )}
    </div>
  );
}

export default Comparador;