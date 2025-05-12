import React from 'react';
import { useNavigate } from 'react-router-dom';

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
  rowOmmited: number;
  columnOmmited: number;
  targetColumn: number;
}

function Discretizacion() {
  const navigate = useNavigate();
  const [showSomeData, setShowSomeData] = React.useState(false);
  const [showData, setShowData] = React.useState(false);
  const [showDiscretized, setShowDiscretized] = React.useState(false);
  const [data, setData] = React.useState<number[][]>([]);
  const [showFormatedData, setShowNotFormattedData] = React.useState(true);
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
    rowOmmited: 0,
    columnOmmited: 0,
    targetColumn: 0,
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
          const parsedData = rows.map((row) =>
            row.split(',').map((num) => parseFloat(num))
          );
          // console.log('parsedData', parsedData);
          const minData = parsedData.map((row) => Math.min(...row));
          const maxData = parsedData.map((row) => Math.max(...row));
          setData(parsedData);
          setParams({
            ...params,
            data: parsedData,
            rawData: parsedData,
            quantityConjuntos: parsedData.length,
            maxQuantityElements: parsedData[0].length,
            minData: minData,
            maxData: maxData,
            cutPoints: Array(parsedData.length).fill([])
          });
          setShowData(true);
          // console.log('Archivo cargado:', paramsMinMax);
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
    const data = params.data.map((row) => row.join(',')).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evaluated_discretized.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calcular la entropía de un conjunto de valores
  const calculateEntropy = (values: number[]) => {
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
  const calculateInformationGain = (values: number[], classes: number[], splitPoint: number) => {
    const totalEntropy = calculateEntropy(classes);

    // Dividir los datos en dos grupos basados en el punto de corte
    const leftIndices = values.map((v, i) => v <= splitPoint ? i : -1).filter(i => i !== -1);
    const rightIndices = values.map((v, i) => v > splitPoint ? i : -1).filter(i => i !== -1);

    // Obtener las clases correspondientes a cada grupo
    const leftClasses = leftIndices.map(i => classes[i]);
    const rightClasses = rightIndices.map(i => classes[i]);

    // Calcular la entropía ponderada después de la división
    const leftWeight = leftClasses.length / classes.length;
    const rightWeight = rightClasses.length / classes.length;

    const leftEntropy = calculateEntropy(leftClasses);
    const rightEntropy = calculateEntropy(rightClasses);

    const weightedEntropy = leftWeight * leftEntropy + rightWeight * rightEntropy;

    // La ganancia de información es la reducción en la entropía
    return totalEntropy - weightedEntropy;
  };

  // Encontrar el mejor punto de corte para un conjunto de valores
  const findBestSplit = (values: number[], classes: number[]) => {
    // Obtener valores únicos ordenados (posibles puntos de corte)
    const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

    // Consideramos los puntos medios entre valores adyacentes como posibles puntos de corte
    const possibleSplits = [];
    for (let i = 0; i < uniqueValues.length - 1; i++) {
      possibleSplits.push((uniqueValues[i] + uniqueValues[i + 1]) / 2);
    }

    if (possibleSplits.length === 0) {
      return null;
    }

    // Evaluar cada posible punto de corte
    let bestSplit = possibleSplits[0];
    let bestGain = calculateInformationGain(values, classes, possibleSplits[0]);

    for (let i = 1; i < possibleSplits.length; i++) {
      const gain = calculateInformationGain(values, classes, possibleSplits[i]);
      if (gain > bestGain) {
        bestGain = gain;
        bestSplit = possibleSplits[i];
      }
    }

    // Si la ganancia es muy pequeña, no vale la pena dividir
    return bestGain > 0.01 ? bestSplit : null;
  };

  // Encontrar múltiples puntos de corte recursivamente
  const findCutPoints = (values: number[], classes: number[], depth: number, maxDepth: number): number[] => {
    if (depth >= maxDepth) {
      return [];
    }

    const bestSplit = findBestSplit(values, classes);

    if (bestSplit === null) {
      return [];
    }

    // Dividir los datos en dos grupos
    const leftValues: number[] = [];
    const rightValues: number[] = [];
    const leftClasses: number[] = [];
    const rightClasses: number[] = [];

    for (let i = 0; i < values.length; i++) {
      if (values[i] <= bestSplit) {
        leftValues.push(values[i]);
        leftClasses.push(classes[i]);
      } else {
        rightValues.push(values[i]);
        rightClasses.push(classes[i]);
      }
    }

    // Encontrar puntos de corte en los subconjuntos recursivamente
    const leftCutPoints = findCutPoints(leftValues, leftClasses, depth + 1, maxDepth);
    const rightCutPoints = findCutPoints(rightValues, rightClasses, depth + 1, maxDepth);

    // Combinar todos los puntos de corte y ordenarlos
    return [...leftCutPoints, bestSplit, ...rightCutPoints].sort((a, b) => a - b);
  };

  // Ejecutar la discretización basada en entropía
  const runEntropyDiscretization = () => {
    const targetColumn = params.targetColumn;
    const numBins = params.numBins;
    const data = params.data;

    if (data.length === 0 || targetColumn >= data[0].length) {
      return;
    }

    // Obtener la columna objetivo (clases)
    const targetClasses = data.map(row => row[targetColumn]);

    // Para cada atributo (columna) excepto la columna objetivo
    const cutPoints: number[][] = [];
    const discretizedData = data.map(row => [...row]);

    for (let col = 0; col < data[0].length; col++) {
      if (col === targetColumn) {
        cutPoints[col] = [];
        continue;
      }

      // Obtener la columna actual
      const columnValues = data.map(row => row[col]);

      // Encontrar puntos de corte usando entropía
      const colCutPoints = findCutPoints(columnValues, targetClasses, 0, Math.log2(numBins));
      cutPoints[col] = colCutPoints;

      // Discretizar los valores usando los puntos de corte
      for (let row = 0; row < data.length; row++) {
        const value = data[row][col];

        // Encontrar en qué intervalo cae el valor
        let bin = 0;
        for (let i = 0; i < colCutPoints.length; i++) {
          if (value > colCutPoints[i]) {
            bin = i + 1;
          }
        }

        discretizedData[row][col] = bin;
      }
    }

    setParams({
      ...params,
      discretizedData: discretizedData,
      cutPoints: cutPoints
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
      <div >
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

        <div>
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
        </div>

        <button
          onClick={runEntropyDiscretization}
          disabled={params.data.length === 0}>
          Ejecutar Discretización
        </button>

        <button
          onClick={() => setShowNotFormattedData(!showFormatedData)}>
          {showFormatedData ? 'Mostrar datos en Texto' : 'Mostrar En Tabla'}
        </button>

        <button
          onClick={saveFile}>
          Guardar Archivo
        </button>

        <button
          onClick={() => setShowSomeData(!showSomeData)}
          disabled={params.discretizedData.length === 0}>
          {showSomeData ? 'Mostrar Todos los Datos' : 'Filtrar Datos'}
        </button>

      </div>

      {/* Mostrar Interfaz para Filtrar */}
      {showSomeData && (
        <div>
          <h2>Valores a Filtrar</h2>
          <div>
            <label htmlFor="minValue">Valores a Mostrar</label>
            <input
              type="textarea"
              inputMode='numeric'
              id="minValue"
              name="minValue"
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
                      <th key={i}>V{i + 1}</th>
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


      {/* Mostrar datos discretizados */}
      {showFormatedData && showDiscretized && (
        <div>
          <h2>Datos Discretizados</h2>
          <div>
            <table>
              <thead>
                <tr>
                  <th>Conjunto</th>
                  {params.discretizedData[0] &&
                    params.discretizedData[0].map((_, i) => (
                      <th key={i}>Atributo {i + 1}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {params.discretizedData.map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
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
                    <td>Atributo {index + 1}</td>
                    <td>{points.map(p => p.toFixed(2)).join(', ') || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Mostrar datos discretizados sin formato */}
      {showDiscretized && !showFormatedData && (
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

      {/* Mostrar datos omitidos */}

      {/* Mostrar datos formateados */}
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
                  <th>Minimo</th>
                  <th>Maximo</th>

                </tr>
              </thead>
              <tbody>
                {params.data.map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    {row.map((value, i) => (
                      <td key={i}>
                        {value}
                      </td>
                    ))
                    }
                    <td>
                      {params.minData[index]}
                    </td>
                    <td>
                      {params.maxData[index]}
                    </td>

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
          {params.rawData.map((row: number[], index: number) => (
            <div key={index}>
              {row.map((value: number, i: number) => (
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
  )
}

export default Discretizacion