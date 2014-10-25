cd firefox
rm -f unhosted@unhosted.projects.uom.lk.xpi
zip -r unhosted@unhosted.projects.uom.lk.xpi .
zip -r ../unhosted@unhosted.projects.uom.lk.xpi .
cd ../
mv unhosted@unhosted.projects.uom.lk.xpi ~/.mozilla/firefox/z0f42hwa.default/extensions
pkill -9 firefox
firefox
