from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

# Configurar o navegador
options = webdriver.ChromeOptions()
options.add_argument("--headless")  # Rodar o Chrome em modo headless
options.add_argument("--disable-infobars")
options.add_argument("--disable-extensions")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

# Iniciar o WebDriver
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

# URL do Google Meet
meet_url = 'https://meet.google.com/vsv-bsqy-mib'

# Abrir o Google Meet
driver.get(meet_url)

# Aguardar a página carregar
time.sleep(10)

try:
    # Esperar que o botão de chat esteja presente
    chat_button = WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.XPATH, '//div[contains(@aria-label, "Chat")]'))
    )
    chat_button.click()

    # Continuar verificando por novas mensagens de chat
    while True:
        messages = driver.find_elements(By.XPATH, '//div[@class="GDhqjd"]')
        for message in messages:
            print(message.text)
        time.sleep(2)  # Verificar a cada 2 segundos

except Exception as e:
    print("Erro ao tentar acessar o chat:", e)

finally:
    driver.quit()
