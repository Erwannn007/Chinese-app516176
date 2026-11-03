# Practice 1 – Module noyau multi-fichiers avec paramètres

**Auteur : Erwann Arnould**

> Create a kernel module, that is consist of multiple ".c" files, and can print
> differently depending on your input parameters. Insert the module to your host Linux.

## Fichiers
| Fichier | Rôle |
|---|---|
| `p1_main.c`  | déclaration des paramètres, `init` (vérifie les paramètres) et `exit` |
| `p1_greet.c` | messages de bonjour / au revoir selon la langue, option majuscules |
| `p1_stats.c` | affiche le tableau `nums` + somme, min, max, moyenne, nombre de pairs |
| `p1.h`       | prototypes partagés entre les 3 fichiers `.c` |
| `Makefile`   | Kbuild : `p1_erwann-objs := p1_main.o p1_greet.o p1_stats.o` → un seul `p1_erwann.ko` |

## Paramètres
| Paramètre | Type | Rôle |
|---|---|---|
| `name`  | charp | nom à saluer (défaut `world`) |
| `lang`  | int   | 0 = anglais, 1 = français, 2 = chinois, 3 = espagnol |
| `times` | int   | nombre de répétitions (1 à 10, sinon `insmod` échoue avec `-EINVAL`) |
| `shout` | bool  | `shout=1` → message en MAJUSCULES |
| `nums`  | int[] | liste d'entiers, ex. `nums=4,9,-3` (max 10) |

## Compilation
```bash
# Ubuntu / Debian
sudo apt install -y build-essential linux-headers-$(uname -r)
# openEuler / Fedora
sudo dnf install -y kernel-devel-$(uname -r) gcc make

make
modinfo p1_erwann.ko
```

## Tests
```bash
# 1) valeurs par défaut
sudo dmesg -C
sudo insmod p1_erwann.ko
sudo dmesg
sudo rmmod p1_erwann

# 2) en français, 3 fois, avec un tableau
sudo dmesg -C
sudo insmod p1_erwann.ko name="Erwann" lang=1 times=3 nums=4,9,-3
sudo dmesg
cat /sys/module/p1_erwann/parameters/name
sudo rmmod p1_erwann
sudo dmesg | tail -1

# 3) en chinois, en majuscules
sudo dmesg -C
sudo insmod p1_erwann.ko name="Prof" lang=2 times=2 shout=1
sudo dmesg
sudo rmmod p1_erwann

# 4) paramètre invalide -> insmod doit échouer
sudo insmod p1_erwann.ko times=42
sudo dmesg | tail -2
```

## Sortie attendue (test 2)
```
p1_erwann: insertion (name=Erwann lang=1 times=3 shout=0 nb_nums=3)
p1_erwann: [1/3] Bonjour, Erwann !
p1_erwann: [2/3] Bonjour, Erwann !
p1_erwann: [3/3] Bonjour, Erwann !
p1_erwann: nums[0] = 4
p1_erwann: nums[1] = 9
p1_erwann: nums[2] = -3
p1_erwann: 3 valeur(s) : somme=10 min=-3 max=9 moyenne=3 pairs=1
Erwann
p1_erwann: Au revoir, Erwann ! Module retire.
```

## Sortie attendue (test 3)
```
p1_erwann: [1/2] NI HAO, PROF !!!
p1_erwann: [2/2] NI HAO, PROF !!!
```

## Sortie attendue (test 4)
```
insmod: ERROR: could not insert module p1_erwann.ko: Invalid parameters
p1_erwann: times=42 invalide (doit etre entre 1 et 10)
```

> Remarque : les messages `loading out-of-tree module taints kernel` et
> `module verification failed` sont normaux pour un module non signé.

## Résultats
`resultats.png` (et `resultats.txt`, la sortie brute) : module compilé puis inséré
dans un noyau Linux `6.8.0-147-generic` (insmod / dmesg / rmmod, avec tous les tests ci-dessus
plus `lang=3`). Avec l'`insmod` de busybox, l'erreur s'affiche
`can't insert 'p1_erwann.ko': Invalid argument` (= -EINVAL) ; avec l'`insmod` classique
(kmod), c'est `Invalid parameters`.
