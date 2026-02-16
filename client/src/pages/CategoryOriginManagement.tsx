import { useState, type FormEvent } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useOrigins,
  useCreateOrigin,
  useDeleteOrigin,
} from "@/hooks/use-inventory";
import { Tags, Globe, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CategoryOriginManagement() {
  const { data: categories, isLoading: loadingCat } = useCategories();
  const { mutate: createCategory, isPending: isCreatingCat } = useCreateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();

  const { data: origins, isLoading: loadingOrigin } = useOrigins();
  const { mutate: createOrigin, isPending: isCreatingOrigin } = useCreateOrigin();
  const { mutate: deleteOrigin } = useDeleteOrigin();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newOriginName, setNewOriginName] = useState("");

  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategory(
      { name: newCategoryName.trim() },
      { onSuccess: () => setNewCategoryName("") }
    );
  };

  const handleAddOrigin = (e: FormEvent) => {
    e.preventDefault();
    if (!newOriginName.trim()) return;
    createOrigin(
      { name: newOriginName.trim() },
      { onSuccess: () => setNewOriginName("") }
    );
  };

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">카테고리 / 원산지 관리</h1>
          <p className="text-muted-foreground mt-1">
            식자재 분류에 사용하는 카테고리와 원산지를 관리합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">등록된 카테고리</CardTitle>
              <Tags className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories?.length || 0}개</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">등록된 원산지</CardTitle>
              <Globe className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{origins?.length || 0}개</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Categories Section */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Tags className="w-5 h-5 text-blue-500" />
                카테고리
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                식자재를 분류하는 카테고리입니다. (예: 공산품, 야채, 육류)
              </p>
            </div>

            <div className="p-4 border-b border-border">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <Input
                  placeholder="새 카테고리 이름"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  data-testid="input-new-category"
                />
                <Button
                  type="submit"
                  disabled={isCreatingCat || !newCategoryName.trim()}
                  data-testid="button-add-category"
                >
                  {isCreatingCat ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>

            <div className="divide-y divide-border">
              {loadingCat ? (
                <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>
              ) : !categories || categories.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  등록된 카테고리가 없습니다.
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group"
                    data-testid={`row-category-${cat.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <Tags className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{cat.name}</span>
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-delete-category-${cat.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{cat.name}" 카테고리를 삭제하시겠습니까?
                            이 카테고리를 사용하는 식자재의 카테고리가 비어있게 됩니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCategory(cat.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            data-testid={`button-confirm-delete-category-${cat.id}`}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Origins Section */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-500" />
                원산지
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                식자재의 원산지입니다. (예: 국내산, 미국산, 호주산)
              </p>
            </div>

            <div className="p-4 border-b border-border">
              <form onSubmit={handleAddOrigin} className="flex gap-2">
                <Input
                  placeholder="새 원산지 이름"
                  value={newOriginName}
                  onChange={(e) => setNewOriginName(e.target.value)}
                  data-testid="input-new-origin"
                />
                <Button
                  type="submit"
                  disabled={isCreatingOrigin || !newOriginName.trim()}
                  data-testid="button-add-origin"
                >
                  {isCreatingOrigin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>

            <div className="divide-y divide-border">
              {loadingOrigin ? (
                <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>
              ) : !origins || origins.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  등록된 원산지가 없습니다.
                </div>
              ) : (
                origins.map((origin) => (
                  <div
                    key={origin.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group"
                    data-testid={`row-origin-${origin.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{origin.name}</span>
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-delete-origin-${origin.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>원산지 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{origin.name}" 원산지를 삭제하시겠습니까?
                            이 원산지를 사용하는 식자재의 원산지가 비어있게 됩니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteOrigin(origin.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            data-testid={`button-confirm-delete-origin-${origin.id}`}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
