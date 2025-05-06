
class FileReader:
    def __init__(self, file_path):
        self.file_path = file_path
        self.content = list[float]

    def LoadToMemory(self, file_path):
        with open(file_path, 'r') as file:
            self.content = [list(map(float, line.strip().split(','))) for line in file]
            
    def PrintContent(self):
        for line in self.content:
            print(line)
            
    def GetContent(self):
        return self.content
            
    
            
            
if __name__ == "__main__":
    import os
    import sys

    sys.path.append(os.path.dirname(__file__))
    test_file = 'forest-1-prueba.txt'
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test', test_file)
    
    print("File path:", file_path)
    
    reader = FileReader(file_path)
    reader.LoadToMemory(file_path)
    reader.PrintContent()