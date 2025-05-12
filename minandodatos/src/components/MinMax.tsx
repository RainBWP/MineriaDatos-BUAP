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
  rowOmmited: number;
  columnOmmited: number;
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
    rowOmmited: 0,
    columnOmmited: 0,
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

          paramsMinMax.rowOmmited = 1;
          // console.log('paramsMinMax', paramsMinMax);

          const rowOmmited = 1;
          const columnOmmited = rows[0].split(',').length;
          paramsMinMax.columnOmmited = columnOmmited;
          const filteredRows = rows.map((row, rowIndex) => 
            rowIndex !== rowOmmited - 1 
              ? row.split(',').filter((_, colIndex) => colIndex !== columnOmmited - 1).join(',') 
              : row
          );
          // console.log('filteredRows', filteredRows);
          const minData = filteredRows.map((row) => Math.min(...row.split(',').map((num) => parseFloat(num))));
          const maxData = filteredRows.map((row) => Math.max(...row.split(',').map((num) => parseFloat(num))));
          const parsedData = rows.map((row) =>
            row.split(',').map((num) => parseFloat(num))
          );
          setData(parsedData);
          setParamsMinMax({ ...paramsMinMax, 
            data: parsedData, 
            rawData: parsedData,
            quantityConjuntos: parsedData.length, 
            maxQuantityElements: parsedData[0].length,
            minData: minData,
            maxData: maxData
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


  const runMinMax = () => {
    const minValue = paramsMinMax.minValue;
    const maxValue = paramsMinMax.maxValue;
    const minData = paramsMinMax.minData;
    const maxData = paramsMinMax.maxData;
    const rowOmmited = paramsMinMax.rowOmmited;
    const columnOmmited = paramsMinMax.columnOmmited;

    const evaluatedData = paramsMinMax.data.map((row, rowIndex) => {
      if (rowIndex === rowOmmited - 1) {
      return paramsMinMax.rawData[rowIndex];
      }
      return row.map((value, colIndex) => {
      if (colIndex === columnOmmited - 1) {
        return paramsMinMax.rawData[rowIndex][colIndex];
      }
      return parseFloat(minMaxLogic(value, minData[rowIndex], maxData[rowIndex], maxValue, minValue).toFixed(2));
      });
    });

    setParamsMinMax({
      ...paramsMinMax,
      evaluatedData: evaluatedData,
    });
    setShowMinMax(true);
  }

  const getValuesToShow = () => {
    const valuesToShow = showOnlyThisData.split(',').map((value) => parseInt(value));
    const filteredData: React.SetStateAction<number[][]> = [];
    paramsMinMax.evaluatedData.map((value,index) => {
      if (valuesToShow.includes(index)) {
        filteredData.push(value);
      }
    })

    if (filteredData.length > 0) {
      setFilteredData([]);
    }
    console.log('filteredData', filteredData);
    setFilteredData(filteredData);
  }

  function minMaxLogic(value: number, minA: number, maxA: number, newMaxA: number, newMinA: number) {
    // Formula MinMax
    // v' = (v - minA) / (maxA - minA) (newMaxA - newMinA) + newMinA
    return ((value - minA) / (maxA - minA)) * (newMaxA - newMinA) + newMinA;
  }

  return (
    <div>
      <div >
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
        <div>
          <label htmlFor="rowOmmited">Omitir Fila <i>0 No omite nada</i></label>
          <input 
            type="number" 
            inputMode='numeric'
            id="rowOmmited" 
            name="rowOmmited"
            value={paramsMinMax.rowOmmited}
            onChange={handleParamChange}
            min={0}
            max={paramsMinMax.rawData.length > 0 ? paramsMinMax.rawData.length : 0}
          />
        </div>
        <div>
          <label htmlFor="columnOmmited">Omitir Columna <i>0 No omite nada</i></label>
          <input 
            type="number" 
            inputMode='numeric'
            id="columnOmmited" 
            name="columnOmmited"
            value={paramsMinMax.columnOmmited}
            onChange={handleParamChange}
            min={0}
            max={paramsMinMax.rawData.length > 0 ? paramsMinMax.rawData[0].length : 0}
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
                      <th key={i}>V{i + 1}</th>
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
      
      {/* Mostrar datos formateados */}
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
                  ))
                  }
                  <td>
                    {paramsMinMax.minData[index]}
                  </td>
                  <td>
                    {paramsMinMax.maxData[index]}
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