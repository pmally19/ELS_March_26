import sys

with open("tmp_old_otc.tsx", "r", encoding="utf-8") as f:
    old_lines = f.readlines()

with open("client/src/pages/sales/OrderToCash.tsx", "r", encoding="utf-8") as f:
    new_lines = f.readlines()

# Extract old block
old_start = -1
old_end = -1
for i, line in enumerate(old_lines):
    if '<TabsContent value="delivery"' in line:
        old_start = i
    elif old_start != -1 and '</TabsContent>' in line:
        # Check if this closing tag belongs to the Delivery tab by balancing tags, 
        # but since we know it's at indentation of 8 spaces:
        if line.startswith('        </TabsContent>'):
            old_end = i
            break

old_block = old_lines[old_start:old_end+1]

# Now let's modify old_block to include the new icon and feature
# Find the button that opens DeliveryDetailDialog
#  onClick={() => {
#    setSelectedDeliveryIdForView(item.id);
#    setShowDeliveryDetailDialog(true);
#  }}
# We will change it to:
#  <Dialog>
#    <DialogTrigger asChild>
#      <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600">
#        <Package className="h-4 w-4" />
#      </Button>
#    </DialogTrigger>
#    <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-6">
#      <DeliveryTabVL02N inlineDeliveryId={item.id} hidePgiTab={true} />
#    </DialogContent>
#  </Dialog>

modified_block = []
skip = False
for i, line in enumerate(old_block):
    if skip:
        if 'View' in line and '</Button>' in old_block[i+1]:
            skip = False
            continue
        if '</Button>' in line:
            skip = False
            continue
        continue

    if 'setSelectedDeliveryIdForView(item.id);' in line and 'setShowDeliveryDetailDialog(true);' in old_block[i+1]:
        # We are at the onClick handler of the View button. Wait, actually I should replace the whole Button.
        pass

# Let's do it simply by string replacement on the joined block
old_text = "".join(old_block)

button_to_replace = """                            {item.type === 'delivery' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDeliveryIdForView(item.id);
                                  setShowDeliveryDetailDialog(true);
                                }}
                                className="text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            )}"""

new_button = """                            {item.type === 'delivery' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 ml-2" title="Manage Delivery (VL02N)">
                                    <Package className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-6 overflow-hidden flex flex-col">
                                  <DialogHeader>
                                    <DialogTitle>Delivery Management</DialogTitle>
                                  </DialogHeader>
                                  <div className="flex-1 overflow-auto min-h-[600px]">
                                    <DeliveryTabVL02N inlineDeliveryId={item.id} hidePgiTab={true} />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}"""

old_text = old_text.replace(button_to_replace, new_button)

# Find new block
new_start = -1
new_end = -1
for i, line in enumerate(new_lines):
    if '<TabsContent value="delivery"' in line:
        new_start = i
    elif new_start != -1 and '</TabsContent>' in line:
        if line.startswith('        </TabsContent>'):
            new_end = i
            break

if new_start != -1 and new_end != -1:
    final_lines = new_lines[:new_start] + [old_text] + new_lines[new_end+1:]
    with open("client/src/pages/sales/OrderToCash.tsx", "w", encoding="utf-8") as f:
        f.writelines(final_lines)
    print("Replaced delivery block successfully.")
else:
    print("Could not find new block")
