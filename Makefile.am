# Process this file with automake to produce Makefile.in.
# 
# Copyright 1997, 1998, 2005, 2006, 2007, 2008 Free Software
# Foundation, Inc.
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3, or (at your option)
# any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

# Subdirectories to descend into.
SUBDIRS = etc src usr test/callblockerd

install-exec-hook:
	chown -R www-data.www-data $(sysconfdir)/callblocker
	chmod a+x $(datadir)/callblocker/*.py
	chmod a-x $(datadir)/callblocker/*_base.py
	chmod a+x $(localstatedir)/www/callblocker/python-fcgi/api.py
