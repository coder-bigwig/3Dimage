package com.medical3d.viewer.modules.asset.mapper;
import com.medical3d.viewer.modules.asset.entity.ModelAssetEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.UUID;
@Mapper public interface ModelAssetMapper { List<ModelAssetEntity> findReadyByResultId(@Param("resultId") UUID resultId); }
