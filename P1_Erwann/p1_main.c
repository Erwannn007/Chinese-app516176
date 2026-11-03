// SPDX-License-Identifier: GPL-2.0
/*
 * p1_main.c - init / exit du module p1_erwann + déclaration des paramètres
 * Auteur : Erwann Arnould
 *
 * Le module est composé de 3 fichiers .c :
 *   p1_main.c  -> paramètres, init, exit
 *   p1_greet.c -> messages de bienvenue / d'au revoir (selon la langue)
 *   p1_stats.c -> affichage et statistiques d'un tableau d'entiers
 */
#include <linux/init.h>
#include <linux/module.h>
#include <linux/moduleparam.h>
#include "p1.h"

#define NB_MAX 10

/* ---- Paramètres du module ---- */
static char *name = "world";
module_param(name, charp, 0444);
MODULE_PARM_DESC(name, "Nom de la personne a saluer (defaut: world)");

static int lang;
module_param(lang, int, 0444);
MODULE_PARM_DESC(lang, "Langue: 0=anglais 1=francais 2=chinois 3=espagnol (defaut: 0)");

static int times = 1;
module_param(times, int, 0444);
MODULE_PARM_DESC(times, "Nombre de repetitions du message, de 1 a 10 (defaut: 1)");

static bool shout;
module_param(shout, bool, 0444);
MODULE_PARM_DESC(shout, "Si 1 / Y : le message est affiche en MAJUSCULES (defaut: N)");

static int nums[NB_MAX];
static int nb_nums;
module_param_array(nums, int, &nb_nums, 0444);
MODULE_PARM_DESC(nums, "Liste d'entiers separes par des virgules (max 10)");

static int __init p1_init(void)
{
	pr_info(P1_TAG "insertion (name=%s lang=%d times=%d shout=%d nb_nums=%d)\n",
		name, lang, times, shout, nb_nums);

	/* Vérification des paramètres : si invalide, insmod échoue */
	if (times < 1 || times > 10) {
		pr_err(P1_TAG "times=%d invalide (doit etre entre 1 et 10)\n", times);
		return -EINVAL;
	}

	p1_say_hello(name, lang, times, shout);

	if (nb_nums > 0)
		p1_show_stats(nums, nb_nums);
	else
		pr_info(P1_TAG "pas de nombres fournis (parametre nums vide)\n");

	return 0;
}

static void __exit p1_exit(void)
{
	p1_say_bye(name, lang);
}

module_init(p1_init);
module_exit(p1_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Erwann Arnould");
MODULE_DESCRIPTION("Practice 1 - module noyau multi-fichiers avec parametres");
MODULE_VERSION("1.0");
