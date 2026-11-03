# Module final : p1_erwann.ko, construit à partir de 3 fichiers .c
# (le nom du module doit être différent du nom des fichiers sources)
# Auteur : Erwann Arnould
obj-m := p1_erwann.o
p1_erwann-objs := p1_main.o p1_greet.o p1_stats.o

KDIR ?= /lib/modules/$(shell uname -r)/build
PWD  := $(shell pwd)

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
