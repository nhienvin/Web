const Category = require('../models/Category');
const AppError = require('../utils/appError');

// Tạo danh mục mới
exports.createCategory = async (req, res, next) => {
  try {
    const { name, parentId } = req.body;

    // Xác định level
    let level = 1;
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) throw new AppError('Danh mục cha không tồn tại', 404);
      level = parent.level + 1;
      if (level > 3) throw new AppError('Chỉ hỗ trợ tối đa 3 cấp danh mục', 400);
    }

    const category = await Category.create({ name, parentId, level });

    res.status(201).json({
      status: 'success',
      data: { category }
    });
  } catch (err) {
    next(err);
  }
};

// Lấy danh mục dạng cây
exports.getCategoryTree = async (req, res, next) => {
  try {
    // Lấy tất cả danh mục và xây dựng cây thủ công
    const allCategories = await Category.find().lean();

    if (!allCategories || allCategories.length === 0) {
      return res.status(200).json({ data: { categories: [] } });
    }
    // Hàm đệ quy xây dựng cây
    const buildTree = (parentId = null) => {
      return allCategories
        .filter(cat => String(cat.parentId) === String(parentId))
        .map(category => ({
          ...category,
          children: buildTree(category._id)
        }));
    };

    const tree = buildTree();

    res.status(200).json({
      status: 'success',
      data: { categories: tree }
    });
  } catch (err) {
    next(err);
  }
};
exports.updateCategory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, parentId } = req.body;
  
      // 1. Kiểm tra danh mục tồn tại
      const category = await Category.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        { new: true, runValidators: true }
      );
      if (!category) {
        return next(new AppError('Không tìm thấy danh mục', 404));
      }
  
      // 2. Kiểm tra danh mục cha (nếu có)
      let level = category.level;
      if (parentId) {
        const parent = await Category.findById(parentId);
        if (!parent) {
          return next(new AppError('Danh mục cha không tồn tại', 404));
        }
        level = parent.level + 1;
        if (level > 3) {
          return next(new AppError('Không thể vượt quá 3 cấp danh mục', 400));
        }
        
        // 3. Không cho làm con của chính nó hoặc con cháu của nó
        if (parentId === id.toString() || await isDescendant(id, parentId)) {
          return next(new AppError('Không thể chọn danh mục con làm danh mục cha', 400));
        }
      }
  
      // 4. Cập nhật
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        { name, parentId, level },
        { new: true, runValidators: true }
      );
      //Tự động cập nhật level cho toàn bộ cây con (nếu đổi parentId)
      // Trong controller
    if (parentId !== category.parentId?.toString()) {
        await updateChildrenLevel(id, level);
    }
      res.status(200).json({
        status: 'success',
        data: { category: updatedCategory }
      });
    } catch (err) {
      next(err);
    }
  };
  
// Hàm helper kiểm tra danh mục cha có phải là con cháu hay không
async function isDescendant(childId, parentId) {
    const children = await Category.find({ parentId: childId });
    for (const c of children) {
        if (c._id.toString() === parentId) return true;
        if (await isDescendant(c._id, parentId)) return true;
    }
    return false;
}
// Hàm helper
async function updateChildrenLevel(parentId, parentLevel) {
    const children = await Category.find({ parentId });
    for (const child of children) {
    const newLevel = parentLevel + 1;
    await Category.findByIdAndUpdate(child._id, { level: newLevel });
    await updateChildrenLevel(child._id, newLevel); // Đệ quy
    }
}

exports.deleteCategory = async (req, res, next) => {
    const category = await Category.findById(req.params.id);
    
    // Kiểm tra danh mục có con hay không
    if (hasChildren) {
      return next(new AppError('Không thể xóa danh mục có chứa danh mục con', 400));
    }
  
    await Category.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success', data: null });
  };
// Xóa đệ quy
const deleteCategoryTree = async (categoryId) => {
  const children = await Category.find({ parentId: categoryId });
  for (const child of children) {
    await deleteCategoryTree(child._id);
  }
  await Category.findByIdAndDelete(categoryId);
};