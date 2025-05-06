from FileReader import FileReader

class MinMax:
    def __init__(self, min=0, max=1, file_path=None):
        self.min = min
        self.max = max
        self.data_reader = FileReader(file_path) if file_path else None
        self.data_notNormalized = []
        self.data_Normalized = []

    def updateData(self):
        self.data_reader.LoadToMemory(self.data_reader.file_path) if self.data_reader else None
        self.data_notNormalized = self.data_reader.GetContent() if self.data_reader else None

    def fit(self, data):
        
        
        
        self.data_min = data.min()
        self.data_max = data.max()

    def transform(self, data):
        return (data - self.data_min) / (self.data_max - self.data_min) * (self.max - self.min) + self.min

    def fit_transform(self, data):
        self.fit(data)
        return self.transform(data)
    
    def updateFilePath(self, file_path):
        self.data = FileReader(file_path)
        
    def GetDataNotNormalized(self):
        return self.data_notNormalized
    
    def GetDataNormalized(self):
        return self.data_Normalized
        
    def start_minmax(self):
        minmax = self.updateData()
        data = self.data_notNormalized
        
        for line in data:
            line = list(map(float, line))
            self.data_Normalized.append(self.fit_transform(line))
        self.data_notNormalized = data
        self.data_Normalized = self.data_Normalized
            
if __name__ == "__main__":
    import os
    import sys

    sys.path.append(os.path.dirname(__file__))
    test_file = 'forest-1-prueba.txt'
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test', test_file)
    
    print("File path:", file_path)
    
    minmax = MinMax(file_path=file_path)
    minmax.start_minmax()
    
    Nomalizado = minmax.GetDataNormalized()
    NoNormalizado = minmax.GetDataNotNormalized()
    
    print("Data Normalized:", Nomalizado)
    print("Data Not Normalized:", NoNormalizado)
    
    
    