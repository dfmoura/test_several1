import yfinance as yf

def get_b3_tickers():
    # Get all tickers listed on B3
    b3_tickers = yf.download('^BVSP', period="1d")['Symbol'].tolist()

    return b3_tickers

if __name__ == "__main__":
    b3_tickers = get_b3_tickers()
    print(b3_tickers)
