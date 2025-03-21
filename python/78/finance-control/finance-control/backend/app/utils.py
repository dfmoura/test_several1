from ofxparse import OfxParser
from .models import db, Transaction

def import_ofx(file_path):
    with open(file_path, 'rb') as file:
        ofx = OfxParser.parse(file)
        for account in ofx.accounts:
            for transaction in account.statement.transactions:
                new_transaction = Transaction(
                    date=transaction.date,
                    amount=transaction.amount,
                    description=transaction.payee,
                    category=None
                )
                db.session.add(new_transaction)
        db.session.commit()