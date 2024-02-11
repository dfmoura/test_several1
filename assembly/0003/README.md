
```markdown
# Resumo Básico de Assembly

## 1) Criar arquivo `asm.s`

```assembly
.global _start

_start:
```

## 2) Rodar no terminal o assembly:

```bash
as asm.s -o asm.o
```

## 3) Transformar o arquivo em um executável:

```bash
gcc -o asm asm.o -nostdlib
```

## 4) Executar o arquivo:

```bash
./asm
```

## 5) Criar a primeira instrução `MOV`

```assembly
.global _start
.intel_syntax noprefix

_start:
    MOV rax, 0x3c
    MOV rdi, 11
    SYSCALL
```

## 6) Criar uma função

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

## 7) Criar uma frase

```assembly
.global _start
.intel_syntax noprefix

_start:
    CALL print_hello_world
    JMP exit

print_hello_world:
    MOV rax, 0x01
    MOV rdi, 0x01
    LEA rsi, [hello_str]
    MOV rdx, 14
    SYSCALL
    RET

exit:
    MOV rax, 0x3c
    MOV rdi, 11
    SYSCALL

.section .data
    hello_str: .asciz "hello, world!\n"
```

## Terminal

Utilize esta sequência para rodar:

1. Rodar o assembly: `as asm.s -o asm.o`
2. Rodar o compilador: `gcc -o asm asm.o -nostdlib`
3. Rodar o executável: `./asm`
4. Rodar o echo para saber o último status code do terminal: `echo $?`

**Observações**:

- `.intel_syntax noprefix`: Versão "humana" da sintaxe.
- `-oprefix` para não utilizar o `%` antes dos registradores.
```
