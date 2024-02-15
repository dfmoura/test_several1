import tkinter as tk
from tkinter import ttk
import sqlite3

class FinancialControlApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Personal Financial Control Program")

        self.create_gui()

        # Initialize SQLite database
        self.conn = sqlite3.connect('financial_records.db')
        self.cursor = self.conn.cursor()
        self.cursor.execute('''CREATE TABLE IF NOT EXISTS records
                             (id INTEGER PRIMARY KEY,
                             date TEXT,
                             description TEXT,
                             amount REAL)''')
        self.conn.commit()

        self.load_records()

    def create_gui(self):
        self.date_label = ttk.Label(self.root, text="Date:")
        self.date_label.grid(row=0, column=0)
        self.date_entry = ttk.Entry(self.root)
        self.date_entry.grid(row=0, column=1)

        self.description_label = ttk.Label(self.root, text="Description:")
        self.description_label.grid(row=1, column=0)
        self.description_entry = ttk.Entry(self.root)
        self.description_entry.grid(row=1, column=1)

        self.amount_label = ttk.Label(self.root, text="Amount:")
        self.amount_label.grid(row=2, column=0)
        self.amount_entry = ttk.Entry(self.root)
        self.amount_entry.grid(row=2, column=1)

        self.add_button = ttk.Button(self.root, text="Add Record", command=self.add_record)
        self.add_button.grid(row=3, column=0, columnspan=2)

        self.record_table = ttk.Treeview(self.root, columns=("Date", "Description", "Amount"))
        self.record_table.grid(row=4, column=0, columnspan=2)
        self.record_table.heading("#0", text="ID")
        self.record_table.heading("Date", text="Date")
        self.record_table.heading("Description", text="Description")
        self.record_table.heading("Amount", text="Amount")

        self.delete_button = ttk.Button(self.root, text="Delete Selected", command=self.delete_record)
        self.delete_button.grid(row=5, column=0, columnspan=2)

    def add_record(self):
        date = self.date_entry.get()
        description = self.description_entry.get()
        amount = float(self.amount_entry.get())

        self.cursor.execute("INSERT INTO records (date, description, amount) VALUES (?, ?, ?)", (date, description, amount))
        self.conn.commit()
        self.load_records()

    def delete_record(self):
        selected_item = self.record_table.selection()
        if selected_item:
            id = self.record_table.item(selected_item)["text"]
            self.cursor.execute("DELETE FROM records WHERE id=?", (id,))
            self.conn.commit()
            self.load_records()

    def load_records(self):
        self.record_table.delete(*self.record_table.get_children())
        self.cursor.execute("SELECT * FROM records")
        records = self.cursor.fetchall()
        for record in records:
            self.record_table.insert("", "end", text=record[0], values=(record[1], record[2], record[3]))

if __name__ == "__main__":
    root = tk.Tk()
    app = FinancialControlApp(root)
    root.mainloop()
