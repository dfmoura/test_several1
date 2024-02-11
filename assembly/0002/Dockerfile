FROM debian:stable

# Install NASM (Netwide Assembler) and GNU Binutils
RUN apt-get update && \
    apt-get install -y nasm binutils

# Copy the assembly source code into the container
COPY hello.asm /hello.asm

# Compile the assembly code
RUN nasm -f elf -o /hello.o /hello.asm

# Link the object file and create the executable
RUN ld -m elf_i386 -o /hello /hello.o

# Run the executable
CMD ["/hello"]
