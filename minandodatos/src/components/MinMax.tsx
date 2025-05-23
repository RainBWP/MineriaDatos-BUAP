import React from 'react';
import { useNavigate } from 'react-router-dom';

interface paramsDataToPlay {
  data: number[][];
  rawData: number[][];
  evaluatedData: number[][];
  quantityConjuntos: number;
  maxQuantityElements: number;
  minValue: number;
  maxValue: number;
  minData: number[];
  maxData: number[];
  normalizedColumns: number[]; // Keep track of already normalized columns
}

function MinMax() {
  const navigate = useNavigate();
  const [showSomeData, setShowSomeData] = React.useState(false);
  const [showData, setShowData] = React.useState(false);
  const [showMinMax, setShowMinMax] = React.useState(false);
  const [, setData] = React.useState<number[][]>([]);
  const [showFormatedData, setShowNotFormattedData] = React.useState(true);
  const [showOnlyThisData, setShowOnlyThisData] = React.useState<string>('');
  const [filteredData, setFilteredData] = React.useState<number[][]>([]);
  const [paramsMinMax, setParamsMinMax] = React.useState<paramsDataToPlay>({
    data: [],
    rawData: [],
    evaluatedData: [],
    minValue: 1,
    maxValue: 10,
    quantityConjuntos: 0,
    maxQuantityElements: 0,
    minData: [],
    maxData: [],
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
          
          setData(parsedData);
          setParamsMinMax({
            ...paramsMinMax,
            data: parsedData,
            rawData: parsedData,
            quantityConjuntos: parsedData.length,
            maxQuantityElements: parsedData[0].length,
            minData: minData,
            maxData: maxData,
            normalizedColumns: normalizedColumns
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

    setParamsMinMax({
      ...paramsMinMax,
      [name]: parsedValue,
    });
  };
  
  // Guardar archivo
  const saveFile = () => {
    const data = paramsMinMax.evaluatedData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evaluated_minmax.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Update the minMaxLogic function to handle edge cases
  function minMaxLogic(value: number, minA: number, maxA: number, newMaxA: number, newMinA: number) {
    // Handle edge case where min equals max (to avoid division by zero)
    if (minA === maxA) {
      return newMinA; // or could return average: (newMaxA + newMinA) / 2
    }
    
    // Formula MinMax
    // v' = (v - minA) / (maxA - minA) * (newMaxA - newMinA) + newMinA
    return ((value - minA) / (maxA - minA)) * (newMaxA - newMinA) + newMinA;
  }

  const runMinMax = () => {
    const minValue = paramsMinMax.minValue;
    const maxValue = paramsMinMax.maxValue;
    const minData = paramsMinMax.minData;
    const maxData = paramsMinMax.maxData;
    const normalizedColumns = paramsMinMax.normalizedColumns;

    const evaluatedData = paramsMinMax.data.map((row, rowIndex) => {
      // Keep header row intact
      if (rowIndex === 0) {
        return paramsMinMax.rawData[rowIndex];
      }
      
      // For data rows, apply MinMax normalization
      return row.map((value, colIndex) => {
        // Skip normalization for already normalized columns
        if (normalizedColumns.includes(colIndex)) {
          return paramsMinMax.rawData[rowIndex][colIndex];
        }
        
        // Get the min/max for this data row (adjust index since minData doesn't include header)
        const rowMinValue = minData[rowIndex - 1]; 
        const rowMaxValue = maxData[rowIndex - 1];
        
        // Only normalize if we have valid min/max values
        if (isNaN(rowMinValue) || isNaN(rowMaxValue)) {
          return value; // Keep original value if we can't normalize
        }
        
        // Apply MinMax formula to other columns
        return parseFloat(minMaxLogic(
          value, 
          rowMinValue,
          rowMaxValue, 
          maxValue, 
          minValue
        ).toFixed(2));
      });
    });

    setParamsMinMax({
      ...paramsMinMax,
      evaluatedData: evaluatedData,
    });
    setShowMinMax(true);
  }

  // Rest of the functions
  const getValuesToShow = () => {
    const valuesToShow = showOnlyThisData.split(',').map((value) => parseInt(value));
    const filteredData: React.SetStateAction<number[][]> = [];
    paramsMinMax.evaluatedData.map((value, index) => {
      if (valuesToShow.includes(index)) {
        filteredData.push(value);
      }
    })

    if (filteredData.length > 0) {
      setFilteredData([]);
    }
    setFilteredData(filteredData);
  }

  return (
    <div>
      <div>
        <h1>Normalizacion MinMax</h1>
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
          <label htmlFor="minValue">Valor mínimo</label>
          <input 
            type="number" 
            inputMode='numeric'
            id="minValue"  
            name="minValue"
            value={paramsMinMax.minValue}
            onChange={handleParamChange}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="maxValue">Valor máximo</label>
          <input 
            type="number" 
            inputMode='numeric'
            id="maxValue" 
            name="maxValue"
            value={paramsMinMax.maxValue}
            onChange={handleParamChange}
            min={0}
          />
        </div>
        <button
          onClick={runMinMax}
          disabled={paramsMinMax.data.length === 0}>
          Realizar MinMax
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
          disabled={paramsMinMax.evaluatedData.length === 0}>
          {showSomeData ?  'Mostrar Todos los Datos' : 'Filtrar Normalizacion'}
        </button>
      </div>

      {/* Mostrar Interfaz para Filtrar */}
      { showSomeData && (
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

      {/* Mostrar Resultado de MinMax */}
      {
        !showSomeData && !showFormatedData && showMinMax && showData && (
          <div>
            <h2>Resultado de MinMax</h2>
            {paramsMinMax.evaluatedData.map((row, index) => (
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
      {
        showFormatedData && showMinMax && showData && !showSomeData && (
          <div>
            <h2>Resultado de MinMax</h2>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Conjunto</th>
                    {paramsMinMax.quantityConjuntos > 0 &&
                      Array.from({ length: paramsMinMax.maxQuantityElements }, (_, i) => (
                      <th key={i}>
                        V{i + 1}
                        {paramsMinMax.normalizedColumns.includes(i) && ' (Ya normalizada)'}
                      </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {paramsMinMax.evaluatedData.map((row, index) => (
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
        )
      }


      {/* Mostrar datos omitidos */}
        {showData && showFormatedData && (
          <div>
          <h2>Archivo Cargado</h2>
          <div>
            <table>
          <thead>
            <tr>
              <th>Conjunto</th>
              {paramsMinMax.quantityConjuntos > 0 &&
            Array.from({ length: paramsMinMax.maxQuantityElements }, (_, i) => (
            <th key={i}>V{i + 1}</th>
            ))}
            <th>Minimo</th>
            <th>Maximo</th>
            </tr>
          </thead>
          <tbody>
            {paramsMinMax.data.map((row, index) => (
              <tr key={index}>
            <td>{index}</td>
            {row.map((value, i) => (
              <td key={i}>
                {value}
              </td>
            ))}
            <td>
              {index === 0 ? 0 : paramsMinMax.minData[index - 1]}
            </td>
            <td>
              {index === 0 ? 0 : paramsMinMax.maxData[index - 1]}
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
          {paramsMinMax.rawData.map((row, index) => (
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
  )
}

export default MinMax