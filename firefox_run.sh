cd firefox
rm -f unhosted@unhosted.projects.uom.lk.xpi
zip -r unhosted@unhosted.projects.uom.lk.xpi .
zip -r ../unhosted@unhosted.projects.uom.lk.xpi .
cd ../
mv unhosted@unhosted.projects.uom.lk.xpi ~/.mozilla/firefox/cl3yr8ek.default-1415592935346/extensions
pkill -9 firefox
firefox
