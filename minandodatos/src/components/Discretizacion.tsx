import React from 'react';
import { useNavigate } from 'react-router-dom';

// Define the interface for the discretization parameters
interface paramsDiscretization {
  data: number[][];
  rawData: number[][];
  discretizedData: number[][];
  quantityConjuntos: number;
  maxQuantityElements: number;
  numBins: number;
  minData: number[];
  maxData: number[];
  cutPoints: number[][];
  targetColumn: number;
  normalizedColumns: number[]; // Keep track of already normalized columns
}

// AttributeValueAndClass record similar to Java implementation
interface AttributeValueAndClass {
  attributeValue: number;
  classLabel: number;
}

function Discretizacion() {
  const navigate = useNavigate();
  const [showSomeData, setShowSomeData] = React.useState(false);
  const [showData, setShowData] = React.useState(false);
  const [showDiscretized, setShowDiscretized] = React.useState(false);
  const [, setData] = React.useState<number[][]>([]);
  const [showFormatedData, setShowNotFormattedData] = React.useState(false);
  const [showOnlyThisData, setShowOnlyThisData] = React.useState<string>('');
  const [filteredData, setFilteredData] = React.useState<number[][]>([]);
  const [params, setParams] = React.useState<paramsDiscretization>({
    data: [],
    rawData: [],
    discretizedData: [],
    numBins: 3,
    quantityConjuntos: 0,
    maxQuantityElements: 0,
    minData: [],
    maxData: [],
    cutPoints: [],
    targetColumn: 0,
    normalizedColumns: [], // Initialize the array
  });

  // Manejar la carga del archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent === 'string') {
          const rows = fileContent.split('\n');
          
          // Check for already normalized columns (header values > 1)
          const headerRow = rows[0].split(',').map(val => parseFloat(val));
          const normalizedColumns = headerRow
            .map((val, idx) => val > 1 ? idx : -1)
            .filter(idx => idx !== -1);
          
          // Separate header from data
          const dataRows = rows.slice(1);
          
          // Calculate min and max values for each data row - excluding normalized columns
          const rowMinMaxValues = dataRows.map(row => {
            const rowValues = row.split(',').map(val => parseFloat(val));
            
            // Filter values that are not in normalized columns
            const filteredValues = rowValues.filter((val, idx) => 
              !normalizedColumns.includes(idx) && !isNaN(val)
            );
            
            return {
              min: Math.min(...filteredValues),
              max: Math.max(...filteredValues)
            };
          });
          
          const minData = rowMinMaxValues.map(item => item.min);
          const maxData = rowMinMaxValues.map(item => item.max);
          
          // Parse all data including header
          const parsedData = rows.map(row =>
            row.split(',').map(num => parseFloat(num))
          );

          // Determinar la columna objetivo como la última columna
          const lastColumnIndex = parsedData[0].length - 1;

          setData(parsedData);
          setParams({
            ...params,
            data: parsedData,
            rawData: parsedData,
            quantityConjuntos: parsedData.length,
            maxQuantityElements: parsedData[0].length,
            minData: minData,
            maxData: maxData,
            normalizedColumns: normalizedColumns,
            cutPoints: Array(parsedData[0].length).fill([]),
            targetColumn: lastColumnIndex, // <-- Aquí se asigna la última columna
          });
          setShowData(true);
        } else {
          console.error('Error al leer el archivo');
        }
      };
      reader.readAsText(file);
    }
  };

  // Manejar cambios en los parámetros
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsedValue = parseInt(value);

    setParams({
      ...params,
      [name]: parsedValue,
    });
  };
  
  // Guardar archivo
  const saveFile = () => {
    const data = params.discretizedData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discretized_data.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Implementación de las funciones de discretización ---

  // Calcular la entropía de un conjunto de valores
  const calculateEntropy = (values: number[]) => {
    if (!values || values.length === 0) {
      return 0;
    }

    const valueCounts: { [key: number]: number } = {};

    // Contar la frecuencia de cada valor
    values.forEach(value => {
      if (valueCounts[value] === undefined) {
        valueCounts[value] = 1;
      } else {
        valueCounts[value]++;
      }
    });

    const totalCount = values.length;
    let entropy = 0;

    // Calcular la entropía usando la fórmula de Shannon
    Object.values(valueCounts).forEach(count => {
      const probability = count / totalCount;
      entropy -= probability * Math.log2(probability);
    });

    return entropy;
  };

  // Calcular la ganancia de información al dividir en un punto específico
  const calculateInformationGain = (data: AttributeValueAndClass[], splitPoint: number) => {
    if (!data || data.length === 0) {
      return 0;
    }

    const classValues = data.map(item => item.classLabel);
    const totalEntropy = calculateEntropy(classValues);

    // Dividir los datos en dos grupos basados en el punto de corte
    const leftGroup: AttributeValueAndClass[] = [];
    const rightGroup: AttributeValueAndClass[] = [];

    data.forEach(item => {
      if (item.attributeValue <= splitPoint) {
        leftGroup.push(item);
      } else {
        rightGroup.push(item);
      }
    });

    // Si algún grupo está vacío, no es un buen punto de corte
    if (leftGroup.length === 0 || rightGroup.length === 0) {
      return 0;
    }

    // Calcular la entropía ponderada después de la división
    const leftWeight = leftGroup.length / data.length;
    const rightWeight = rightGroup.length / data.length;

    const leftEntropy = calculateEntropy(leftGroup.map(item => item.classLabel));
    const rightEntropy = calculateEntropy(rightGroup.map(item => item.classLabel));

    const weightedEntropy = leftWeight * leftEntropy + rightWeight * rightEntropy;

    // La ganancia de información es la reducción en la entropía
    return totalEntropy - weightedEntropy;
  };

  // Encontrar el mejor punto de corte para un conjunto de valores
  const findBestSplit = (data: AttributeValueAndClass[]) => {
    if (!data || data.length < 2) {
      return { splitPoint: NaN, informationGain: 0 };
    }

    // Ordenar los datos por valor de atributo
    const sortedData = [...data].sort((a, b) => a.attributeValue - b.attributeValue);

    // Encontrar posibles puntos de corte (puntos medios entre valores adyacentes)
    const possibleSplits: number[] = [];
    for (let i = 0; i < sortedData.length - 1; i++) {
      const currentInstance = sortedData[i];
      const nextInstance = sortedData[i + 1];
      
      // Solo considerar puntos entre instancias de diferentes clases
      if (currentInstance.classLabel !== nextInstance.classLabel && 
          currentInstance.attributeValue !== nextInstance.attributeValue) {
        possibleSplits.push((currentInstance.attributeValue + nextInstance.attributeValue) / 2);
      }
    }

    if (possibleSplits.length === 0) {
      return { splitPoint: NaN, informationGain: 0 };
    }

    // Evaluar cada posible punto de corte
    let bestSplit = possibleSplits[0];
    let bestGain = calculateInformationGain(sortedData, possibleSplits[0]);

    for (let i = 1; i < possibleSplits.length; i++) {
      const gain = calculateInformationGain(sortedData, possibleSplits[i]);
      if (gain > bestGain) {
        bestGain = gain;
        bestSplit = possibleSplits[i];
      }
    }

    // Si la ganancia es muy pequeña, no vale la pena dividir
    return bestGain > 0.01 ? { splitPoint: bestSplit, informationGain: bestGain } : { splitPoint: NaN, informationGain: 0 };
  };

  // Encontrar múltiples puntos de corte recursivamente
  const findCutPoints = (data: AttributeValueAndClass[], depth: number, maxDepth: number): number[] => {
    // Criterios de paro
    if (depth >= maxDepth || data.length < 2) {
      return [];
    }

    // Verificar si todas las instancias tienen la misma clase
    const firstClass = data[0].classLabel;
    const allSameClass = data.every(item => item.classLabel === firstClass);
    if (allSameClass) {
      return [];
    }

    // Verificar si todos los valores de atributo son iguales
    const firstValue = data[0].attributeValue;
    const allSameValue = data.every(item => Math.abs(item.attributeValue - firstValue) < 1e-9);
    if (allSameValue) {
      return [];
    }

    // Encontrar el mejor punto de corte
    const bestSplit = findBestSplit(data);
    if (isNaN(bestSplit.splitPoint) || bestSplit.informationGain <= 0) {
      return [];
    }

    // Dividir los datos en dos grupos
    const leftGroup: AttributeValueAndClass[] = [];
    const rightGroup: AttributeValueAndClass[] = [];

    data.forEach(item => {
      if (item.attributeValue <= bestSplit.splitPoint) {
        leftGroup.push(item);
      } else {
        rightGroup.push(item);
      }
    });

    // Encontrar puntos de corte en los subconjuntos recursivamente
    const leftCutPoints = findCutPoints(leftGroup, depth + 1, maxDepth);
    const rightCutPoints = findCutPoints(rightGroup, depth + 1, maxDepth);

    // Combinar todos los puntos de corte y ordenarlos
    return [...leftCutPoints, bestSplit.splitPoint, ...rightCutPoints].sort((a, b) => a - b);
  };

  // Discretizar un atributo específico
  const discretizeAttribute = (dataMatrix: number[][], attributeIndex: number, classColumnIndex: number): number[] => {
    if (!dataMatrix || dataMatrix.length === 0 || attributeIndex < 0 || classColumnIndex < 0 || attributeIndex === classColumnIndex) {
      console.error("Entrada inválida para discretización");
      return [];
    }

    // Extraer los valores del atributo y las etiquetas de clase
    const attributeData: AttributeValueAndClass[] = [];
    
    for (let i = 1; i < dataMatrix.length; i++) { // Empezamos desde 1 para omitir el encabezado
      const row = dataMatrix[i];
      if (row.length > attributeIndex && row.length > classColumnIndex) {
        attributeData.push({
          attributeValue: row[attributeIndex],
          classLabel: row[classColumnIndex]
        });
      }
    }

    if (attributeData.length === 0) {
      console.error(`No se encontraron datos válidos para la columna ${attributeIndex}`);
      return [];
    }

    // Ordenar los datos para ser procesados
    attributeData.sort((a, b) => a.attributeValue - b.attributeValue);

    // Encontrar los puntos de corte recursivamente
    const maxDepth = Math.log2(params.numBins);
    const cutPoints = findCutPoints(attributeData, 0, maxDepth);

    // Eliminar duplicados y ordenar
    return [...new Set(cutPoints)].sort((a, b) => a - b);
  };

  // Ejecutar discretización para todos los atributos
  const runDiscretization = () => {
    const { data, targetColumn, normalizedColumns } = params;
    
    if (data.length === 0) {
      return;
    }

    // Identificar qué columnas deben ser discretizadas (no la columna objetivo ni las ya normalizadas)
    const columnsToDiscretize = Array.from(
      { length: data[0].length }, 
      (_, i) => i
    ).filter(
      i => i !== targetColumn && !normalizedColumns.includes(i)
    );

    // Inicializar matriz de puntos de corte
    const cutPoints: number[][] = Array(data[0].length).fill(null).map(() => []);

    // Discretizar cada atributo seleccionado
    columnsToDiscretize.forEach(colIndex => {
      cutPoints[colIndex] = discretizeAttribute(data, colIndex, targetColumn);
    });

    // Crear la matriz discretizada
    const discretizedData = data.map((row, rowIndex) => {
      // Mantener el encabezado intacto
      if (rowIndex === 0) {
        return [...row];
      }

      // Discretizar los valores en las filas de datos
      return row.map((value, colIndex) => {
        // No discretizar la columna objetivo ni las columnas ya normalizadas
        if (colIndex === targetColumn || normalizedColumns.includes(colIndex)) {
          return value;
        }

        // Obtener los puntos de corte para esta columna
        const colCutPoints = cutPoints[colIndex];
        
        // Si no hay puntos de corte, mantener el valor original
        if (!colCutPoints || colCutPoints.length === 0) {
          return value;
        }

        // Determinar el intervalo en el que cae el valor
        let binIndex = 0;
        for (const cutPoint of colCutPoints) {
          if (value > cutPoint) {
            binIndex++;
          } else {
            break;
          }
        }

        return binIndex;
      });
    });

    // Actualizar el estado con los datos discretizados y los puntos de corte
    setParams({
      ...params,
      discretizedData,
      cutPoints
    });

    setShowDiscretized(true);
  };

  // Filtrar datos
  const getValuesToShow = () => {
    const valuesToShow = showOnlyThisData.split(',').map((value) => parseInt(value));
    const filteredData: React.SetStateAction<number[][]> = [];
    
    params.discretizedData.map((value, index) => {
      if (valuesToShow.includes(index)) {
        filteredData.push(value);
      }
    });

    setFilteredData(filteredData);
  };

  return (
    <div>
      <div>
        <h1>Discretizacion de Cotas Frontera</h1>
        <button onClick={() => navigate('/')}>Regresar</button>
      </div>
      <div>
        <label htmlFor="dataFile">Cargar Archivo</label>
        <input 
          type="file" 
          id="dataFile" 
          accept=".txt"
          onChange={handleFileChange}
        />
      </div>
      <div className='buttons'>
        <div>
          <label htmlFor="numBins">Número máximo de intervalos</label>
          <input 
            type="number" 
            inputMode='numeric'
            id="numBins"  
            name="numBins"
            value={params.numBins}
            onChange={handleParamChange}
            min={2}
          />
        </div>
        {/* <div>
          <label htmlFor="targetColumn">Columna objetivo (índice de clase)</label>
          <input 
            type="number" 
            inputMode='numeric'
            id="targetColumn" 
            name="targetColumn"
            value={params.targetColumn}
            onChange={handleParamChange}
            min={0}
            max={params.maxQuantityElements > 0 ? params.maxQuantityElements - 1 : 0}
          />
        </div> */}
        <button
          onClick={runDiscretization}
          disabled={params.data.length === 0}>
          Ejecutar Discretización
        </button>

        <button
          onClick={() => setShowNotFormattedData(!showFormatedData)}>
          {showFormatedData ? 'Mostrar datos en Texto' : 'Mostrar En Tabla'}
        </button>

        <button
          onClick={saveFile}
          disabled={params.discretizedData.length === 0}>
          Guardar Archivo
        </button>

        <button
          onClick={() => setShowSomeData(!showSomeData)}
          disabled={params.discretizedData.length === 0}>
          {showSomeData ?  'Mostrar Todos los Datos' : 'Filtrar Datos'}
        </button>
      </div>

      {/* Mostrar Interfaz para Filtrar */}
      { showSomeData && (
        <div>
          <h2>Valores a Filtrar</h2>
          <div>
            <label htmlFor="valuesToShow">Valores a Mostrar</label>
            <input 
              type="textarea" 
              inputMode='numeric'
              id="valuesToShow"  
              name="valuesToShow"
              value={showOnlyThisData}
              onChange={(e) => setShowOnlyThisData(e.target.value)}
              min={0}
            />
            <button
              onClick={getValuesToShow}>
              Filtrar
            </button>
            </div>
        </div>
        )
      }

      {/* Mostrar datos filtrados */}
      {showFormatedData && showSomeData && filteredData.length > 0 && (
        <div>
          <h2>Datos Filtrados</h2>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Conjunto</th>
                  {
                    filteredData[0].map((_, i) => (
                      <th key={i}>Valor {i + 1}</th>
                    ))
                  }
                </tr>
              </thead>
              <tbody>
                {
                filteredData.map((row, index) => (
                  <tr key={index}>
                    <td>{showOnlyThisData.split(',')[index]}</td>
                    {row.map((value, i) => (
                      <td key={i}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Mostrar filtrado sin formato*/}
      {
        showSomeData && !showFormatedData && filteredData.length > 0 && (
          <div>
            <h2>Datos Filtrados</h2>
            {filteredData.map((row, index) => (
              <div key={index}>
                {row.map((value, i) => (
                  <span key={i}>
                    {value}
                    {i < row.length - 1 && ', '}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )
      }

      {/* Mostrar Resultado de Discretización */}
      {
        showFormatedData && showDiscretized && !showSomeData && (
          <div>
            <h2>Datos Discretizados</h2>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Conjunto</th>
                    {params.discretizedData[0] && 
                      Array.from({ length: params.discretizedData[0].length }, (_, i) => (
                      <th key={i}>
                        V{i + 1}
                        {i === params.targetColumn && ' (Clase)'}
                        {params.normalizedColumns.includes(i) && ' (Ya normalizada)'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {params.discretizedData.map((row, index) => (
                    <tr key={index}>
                      <td>{index}</td>
                      {row.map((value, i) => (
                        <td key={i}>
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Puntos de Corte</h3>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Atributo</th>
                    <th>Puntos de Corte</th>
                  </tr>
                </thead>
                <tbody>
                  {params.cutPoints.map((points, index) => (
                    <tr key={index}>
                      <td>V{index + 1}</td>
                      <td>
                        {points && points.length > 0 
                          ? points.map(p => p.toFixed(2)).join(', ') 
                          : (index === params.targetColumn 
                            ? 'Columna de Clase' 
                            : (params.normalizedColumns.includes(index) 
                              ? 'Columna Ya Normalizada' 
                              : 'N/A'))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      } 
      
      {/* Mostrar datos discretizados sin formato */}
      {!showFormatedData && showDiscretized && !showSomeData && (
        <div>
          <h2>Datos Discretizados</h2>
          {params.discretizedData.map((row, index) => (
            <div key={index}>
              {row.map((value, i) => (
                <span key={i}>
                  {value}
                  {i < row.length - 1 && ', '}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Mostrar datos cargados */}
      {showData && showFormatedData && (
        <div>
          <h2>Archivo Cargado</h2>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Conjunto</th>
                  {params.quantityConjuntos > 0 &&
                    Array.from({ length: params.maxQuantityElements }, (_, i) => (
                    <th key={i}>V{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {params.data.map((row, index) => (
                  <tr key={index}>
                    <td>{index}</td>
                    {row.map((value, i) => (
                      <td key={i}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showFormatedData && showData && (
        <div>
          <h2>Archivo Cargado</h2>
          {params.rawData.map((row, index) => (
            <div key={index}>
              {row.map((value, i) => (
                <span key={i}>
                  {value}
                  {i < row.length - 1 && ', '}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Discretizacion;