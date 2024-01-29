# indice the massa corporea ou body mas index
def calculate_bmi(mass, altura):
    return massa / (altura ** 2)

if __name__ == "__main__":
    massa = float(input("Digite sua massa em kg: "))
    altura = float(input("Digite sua altura em metros: "))
    
    imc = calculate_bmi(massa, altura)
    print("Seu imc eh:", imc)
