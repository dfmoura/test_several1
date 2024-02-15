import sqlite3

# Connect to the SQLite database
conn = sqlite3.connect('database.db')
c = conn.cursor()

# Create table if not exists
c.execute('''CREATE TABLE IF NOT EXISTS records
             (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)''')
conn.commit()

def add_record(name, age):
    c.execute("INSERT INTO records (name, age) VALUES (?, ?)", (name, age))
    conn.commit()

def delete_record(record_id):
    c.execute("DELETE FROM records WHERE id=?", (record_id,))
    conn.commit()

def update_record(record_id, name, age):
    c.execute("UPDATE records SET name=?, age=? WHERE id=?", (name, age, record_id))
    conn.commit()

def display_records():
    c.execute("SELECT * FROM records")
    records = c.fetchall()
    print("ID\tName\tAge")
    for record in records:
        print(f"{record[0]}\t{record[1]}\t{record[2]}")

def main():
    while True:
        print("\n1. Add Record")
        print("2. Delete Record")
        print("3. Update Record")
        print("4. Display Records")
        print("5. Exit")
        choice = input("Enter your choice: ")

        if choice == '1':
            name = input("Enter name: ")
            age = int(input("Enter age: "))
            add_record(name, age)
        elif choice == '2':
            record_id = int(input("Enter ID of the record to delete: "))
            delete_record(record_id)
        elif choice == '3':
            record_id = int(input("Enter ID of the record to update: "))
            name = input("Enter new name: ")
            age = int(input("Enter new age: "))
            update_record(record_id, name, age)
        elif choice == '4':
            display_records()
        elif choice == '5':
            break
        else:
            print("Invalid choice")

    conn.close()

if __name__ == "__main__":
    main()
