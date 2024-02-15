import sqlite3

# Connect to SQLite database
conn = sqlite3.connect('example.db')
cursor = conn.cursor()

# Create table
cursor.execute('''CREATE TABLE IF NOT EXISTS data
                  (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)''')
conn.commit()

def insert_data(name, age):
    cursor.execute('''INSERT INTO data (name, age) VALUES (?, ?)''', (name, age))
    conn.commit()

def delete_data(id):
    cursor.execute('''DELETE FROM data WHERE id=?''', (id,))
    conn.commit()

def update_data(id, name, age):
    cursor.execute('''UPDATE data SET name=?, age=? WHERE id=?''', (name, age, id))
    conn.commit()

def display_data():
    cursor.execute('''SELECT * FROM data''')
    rows = cursor.fetchall()
    for row in rows:
        print(row)

# Close connection
def close_connection():
    conn.close()

if __name__ == "__main__":
    while True:
        print("\n1. Insert Data")
        print("2. Delete Data")
        print("3. Update Data")
        print("4. Display Data")
        print("5. Exit")
        choice = input("Enter your choice: ")

        if choice == '1':
            name = input("Enter name: ")
            age = int(input("Enter age: "))
            insert_data(name, age)
        elif choice == '2':
            id = int(input("Enter ID to delete: "))
            delete_data(id)
        elif choice == '3':
            id = int(input("Enter ID to update: "))
            name = input("Enter new name: ")
            age = int(input("Enter new age: "))
            update_data(id, name, age)
        elif choice == '4':
            display_data()
        elif choice == '5':
            close_connection()
            break
        else:
            print("Invalid choice")
