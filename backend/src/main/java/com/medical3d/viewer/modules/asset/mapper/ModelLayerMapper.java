package com.medical3d.viewer.modules.asset.mapper;
import com.medical3d.viewer.modules.asset.entity.ModelLayerEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.UUID;
@Mapper public interface ModelLayerMapper { List<ModelLayerEntity> findByResultId(@Param("resultId") UUID resultId); }
