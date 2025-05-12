# Mineria de Datos
## Instrucciones

Considerando el formato del conjunto de datos especificado en clase (consultar conjuntos de datos colocados en la página del curso):

### **Implementar la normalización Min-Max.**
### **Implementar el método de discretización basado en cotas frontera.**

#### Requisitos

- Para ambos procesos, es necesario poder almacenar/escribir los respectivos resultados, ya que éstos se utilizarán en la fase 2 del proyecto.

- También debe ser posible mostrar en pantalla el respectivo resultado considerando:

    - **i** Listar todos los atributos.
    - **ii** Listar sólo algunos atributos indicando el número del atributo a mostrar separados por comas: `4,8,15`, etc.

### **Implementación del Clasificador k-NN**

Implementar el clasificador **k-NN** utilizando como función de distancia la métrica **HEOM**:

- Debe aceptar como entrada un archivo de entrenamiento **T** y otro de prueba **P**, ambos con el mismo formato de los archivos especificados en el punto 1.
- Calcular y mostrar el error o porcentaje de exactitud al clasificar los ejemplos de **P** utilizando como entrenamiento a **T**.

### **Análisis Experimental**

- Realizar una comparación experimental respecto al desempeño de la implementación propia del punto 2 y algún otro clasificador distinto (de entre los vistos en clase).
- En este análisis, considerar las siguientes variantes:
    - Llevar a cabo o no las fases de normalización y discretización descritas en el punto 1.
    - Probar distintos valores de parámetros requeridos por cada clasificador.
- Para el clasificador a comparar, se puede utilizar alguna implementación existente.
- Utilizar varios conjuntos de datos de distinta naturaleza para la comparación. 
    - Obtener conjuntos de datos del repositorio UCI: [https://archive.ics.uci.edu/].
    - A partir de estos conjuntos, construir los respectivos conjuntos de entrenamiento y prueba.
- Presentar los resultados obtenidos y analizar el impacto de las variantes mencionadas en el desempeño de los clasificadores.