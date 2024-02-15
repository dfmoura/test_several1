import json
import os

class SimpleDatabase:
    def __init__(self):
        self.data = {}
        self.load_data()

    def data_file_path(self):
        return os.path.join(os.path.dirname(__file__), 'data.json')

    def load_data(self):
        data_file = self.data_file_path()
        if os.path.exists(data_file):
            with open(data_file, 'r') as file:
                self.data = json.load(file)
        else:
            self.data = {}

    def save_data(self):
        data_file = self.data_file_path()
        with open(data_file, 'w') as file:
            json.dump(self.data, file)
        print("Data saved.")

    def reset_data(self):
        self.data = {}
        self.save_data()

    def display_data(self):
        print("Database:")
        for key, value in self.data.items():
            print(f"{key}: {value}")
        print()

    def insert_data(self, key, value):
        self.data[key] = value
        self.save_data()

    def delete_data(self, key):
        if key in self.data:
            del self.data[key]
            self.save_data()
            print(f"Entry with key '{key}' deleted.")
        else:
            print(f"No entry found with key '{key}'.")

    def update_data(self, key, new_value):
        if key in self.data:
            self.data[key] = new_value
            self.save_data()
            print(f"Entry with key '{key}' updated.")
        else:
            print(f"No entry found with key '{key}'.")

def main():
    database = SimpleDatabase()
    database.load_data()  # Load data when starting the program

    try:
        while True:
            print("1. Display Database")
            print("2. Insert Data")
            print("3. Delete Data")
            print("4. Update Data")
            print("5. Save Data")
            print("6. Load Data")
            print("7. Reset Data")
            print("8. Exit")

            choice = input("Enter your choice (1-8): ")

            if choice == '1':
                database.display_data()
            elif choice == '2':
                key = input("Enter key: ")
                value = input("Enter value: ")
                database.insert_data(key, value)
            elif choice == '3':
                key = input("Enter key to delete: ")
                database.delete_data(key)
            elif choice == '4':
                key = input("Enter key to update: ")
                new_value = input("Enter new value: ")
                database.update_data(key, new_value)
            elif choice == '5':
                database.save_data()
            elif choice == '6':
                database.load_data()
                print("Data loaded.")
            elif choice == '7':
                database.reset_data()
                print("Data reset.")
            elif choice == '8':
                database.save_data()  # Save data before exiting
                print("Exiting...")
                break
            else:
                print("Invalid choice. Please enter a number between 1 and 8.")
    except KeyboardInterrupt:
        database.save_data()  # Save data if the program is interrupted
        print("\nProgram interrupted. Exiting...")


if __name__ == "__main__":
    main()
