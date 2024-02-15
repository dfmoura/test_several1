Aqui está o código Markdown para o seu assembly com uma formatação visual:

```markdown
# Resumo Básico para Assembly

1. Crie um arquivo `asm.s`.

2. Declare o código:
    ```assembly
    .global _start ; "como se fosse a função main do C."

    _start:
    ```

3. Execute no terminal o assembly: `as asm.s -o asm.o`
   - *Não deu erro...*

4. Transforme o arquivo em um executável: `gcc -o asm asm.o -nostdlib`

5. Execute o arquivo: `./asm`

6. Crie a primeira instrução `MOV`:
    ```assembly
    .global _start
    .intel_syntax noprefix

    _start:
        MOV rax, 0x3c
        MOV rdi, 11
        SYSCALL
    ```

7. Crie uma função:
    ```assembly
    .global _start
    .intel_syntax noprefix

    _start:
        JMP exit

    exit:
        MOV rax, 0x3c
        MOV rdi, 11
        SYSCALL
    ```

8. Crie uma frase:
    ```assembly
    .global _start
    .intel_syntax noprefix

    _start:
        CALL print_hello_world ; 8.6) chamar o entry point...
        JMP exit

    print_hello_world: ; 8.3) vamos chamar a syscall - write.
        MOV rax, 0x01
        MOV rdi, 0x01
        LEA rsi, [hello_str] ;8.4) colocar o ponteiro do começo da string que criou (load effective address)
        MOV rdx, 14 ; 8.5) depois tem que dizer o tamanho da string
        SYSCALL
        RET

    exit:
        MOV rax, 0x3c
        MOV rdi, 11
        SYSCALL

    .section .data ; 8.1) criado esta section para deixar o "hello world" dentro do binário.
        hello_str: .asciz "hello, world!\n" ; 8.2) tem que dizer que é uma string 'asci' terminado com o null terminator igual em C = z
    ```

**Terminal:**

Utilize esta sequência para rodar:
- Rodar assembly: `as asm.s -o asm.o`
- Rodar compilador: `gcc -o asm asm.o -nostdlib -no-pie`
- Rodar o executável: `./asm`
- Rodar o `echo` para saber o último status code do terminal: `echo $?`

*Observações:*
- `.intel_syntax noprefix`: Versão humana da sintaxe, `-oprefix` para não utilizar o `%` antes dos registradores.
```