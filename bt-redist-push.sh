# runs C2.0 Build Template redist, commit, and push
# use from BT directory
function bt_redist_push() {
  msg="$1"

  npm run c20
  git add -A .
  git commit -m "$msg"
  git push
}

for bt in bt-ER-*
do
  cd "$bt"
  bt_redist_push "$1"
  cd ..
done
